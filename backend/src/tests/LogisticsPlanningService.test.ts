jest.mock('node-fetch', () => ({ __esModule: true, default: jest.fn() }));
const mockedFetch = require('node-fetch').default as jest.Mock;

import { LogisticsPlanningService } from '../services/logisticsPlanningService';
import { AppDataSource } from '../database/config';

describe('LogisticsPlanningService - planNewCollectionAfterPayment (happy path)', () => {
  let mockLogisticsRepo: any;
  let mockTruckRepo: any;
  let mockPickupRepo: any;
  let mockTruckAllocRepo: any;
  let mockPickupService: any;
  let mockTimeManager: any;
  let mockSqsClient: any;
  let service: LogisticsPlanningService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogisticsRepo = { update: jest.fn(), create: jest.fn(), findById: jest.fn(), findActiveLogisticsForTruckOnDay: jest.fn().mockResolvedValue([]) };
    mockTruckRepo = { findAll: jest.fn(), findAvailableTrucks: jest.fn() };
    mockPickupRepo = { findById: jest.fn() };
    mockTruckAllocRepo = { create: jest.fn(), findByLogisticsDetailId: jest.fn() };
    mockPickupService = { updatePickupStatus: jest.fn() };
    mockTimeManager = {
      getRealWorldPickupTimestamp: jest.fn(),
      getRealWorldDeliveryTimestamp: jest.fn(),
      getCurrentTime: jest.fn().mockReturnValue(new Date())
    };
    mockSqsClient = { send: jest.fn() };

    // Prevent any real AppDataSource DB repo usage
    (AppDataSource as any).getRepository = jest.fn().mockReturnValue({ delete: jest.fn() });

    service = new LogisticsPlanningService(
      mockTimeManager,
      mockLogisticsRepo,
      mockTruckRepo,
      mockPickupRepo,
      mockTruckAllocRepo,
      mockPickupService,
      mockSqsClient
    );
  });

  it('assigns pickup, queues SQS and updates pickup status', async () => {
    const pickupId = 11;
    const quantity = 5;
    const initialSimDate = new Date();

    // pickup exists and has no prior logistics
    mockPickupRepo.findById.mockResolvedValue({ pickup_id: pickupId, logisticsDetails: null });

    // spy internal assignment to return a "scheduled" logistics detail
    const scheduled = {
      logistics_details_id: 999,
      scheduled_time: new Date(),
      scheduled_real_pickup_timestamp: new Date(Date.now() + 60_000)
    };
    jest.spyOn(service as any, 'assignPickupToTruckAndSchedule').mockResolvedValue(scheduled);

    // spy send to SQS 
    const sendSpy = jest.spyOn(service as any, 'sendPickupMessageToSQS').mockResolvedValue(undefined);

    mockLogisticsRepo.update.mockResolvedValue({ ...scheduled, logistics_status: 'QUEUED_FOR_COLLECTION' });

    mockTimeManager.getRealWorldPickupTimestamp.mockReturnValue(new Date(Date.now() + 60_000));

    const result = await service.planNewCollectionAfterPayment(pickupId, quantity, initialSimDate);

    expect((service as any).assignPickupToTruckAndSchedule).toHaveBeenCalledWith(pickupId, quantity, expect.any(Date), undefined, undefined);

    expect(sendSpy).toHaveBeenCalledWith(scheduled.logistics_details_id, expect.any(Number));

    expect(mockLogisticsRepo.update).toHaveBeenCalledWith(scheduled.logistics_details_id, expect.objectContaining({ logistics_status: expect.anything() }));
    expect(mockPickupService.updatePickupStatus).toHaveBeenCalledWith(pickupId, expect.anything());

    expect(result.logistics_details_id).toBe(scheduled.logistics_details_id);
  });

  it('assignPickupToTruckAndSchedule - marks NO_TRUCKS_AVAILABLE when no trucks are available', async () => {
    const pickupId = 22;
    const quantity = 10;

    mockPickupRepo.findById.mockResolvedValue({ pickup_id: pickupId, total_weight: 200, logisticsDetails: null });
    mockTruckRepo.findAvailableTrucks.mockResolvedValue([]);
    mockTruckRepo.findAll.mockResolvedValue([]);
    mockLogisticsRepo.create.mockResolvedValue({ logistics_details_id: 88, logistics_status: 'NO_TRUCKS_AVAILABLE' });

    await expect((service as any).assignPickupToTruckAndSchedule(pickupId, quantity, new Date()))
      .rejects.toThrow(/no available trucks/i);

    expect(mockLogisticsRepo.create).toHaveBeenCalled();
    expect(mockPickupService.updatePickupStatus).toHaveBeenCalledWith(pickupId, expect.anything());
  });

  it('sendPickupMessageToSQS - throws when SQS client fails', async () => {
    // arrange: SQS client throws
    mockSqsClient.send.mockRejectedValue(new Error('SQS down'));

    // act & assert
    await expect((service as any).sendPickupMessageToSQS(123, 0))
      .rejects.toThrow(/Failed to queue logistics pickup event/i);

    // AWS SDK v3 sends a Command instance as the first arg — assert call happened and inspect its input
    expect(mockSqsClient.send).toHaveBeenCalledTimes(1);
    const sendCmd = mockSqsClient.send.mock.calls[0][0];
    expect(sendCmd).toBeDefined();
    expect(sendCmd.input).toBeDefined();
    expect(sendCmd.input.QueueUrl).toContain('pickup-queue');
    expect(sendCmd.input.MessageBody).toContain('"eventType":"COLLECTION_SCHEDULED"');
  });

  it('sendPickupMessageToSQS - success path sends message with QueueUrl, MessageBody and DelaySeconds', async () => {
    // arrange: SQS client resolves successfully
    mockSqsClient.send.mockResolvedValueOnce({});

    const logisticsId = 123;
    const requestedDelay = 10;

    // act
    await expect((service as any).sendPickupMessageToSQS(logisticsId, requestedDelay)).resolves.toBeUndefined();

    // assert: AWS SDK v3 sent a Command instance and was called once
    expect(mockSqsClient.send).toHaveBeenCalledTimes(1);
    const sendCmd = mockSqsClient.send.mock.calls[0][0];
    expect(sendCmd).toBeDefined();
    expect(sendCmd.input).toBeDefined();

    // important properties on the command input
    expect(sendCmd.input.QueueUrl).toContain('pickup-queue');
    expect(sendCmd.input.MessageBody).toContain(`"logisticsDetailsId":${logisticsId}`);
    // DelaySeconds should be the requested value (or at least a non-negative number)
    expect(typeof sendCmd.input.DelaySeconds).toBe('number');
    expect(sendCmd.input.DelaySeconds).toBeGreaterThanOrEqual(0);
    expect(sendCmd.input.DelaySeconds).toBe(requestedDelay);
  });

  it('assignPickupToTruckAndSchedule - assigns available truck, creates allocation and returns scheduled detail', async () => {
    const pickupId = 33;
    const quantity = 4;
    const now = new Date();

    mockPickupRepo.findById.mockResolvedValue({ pickup_id: pickupId, total_weight: 120 });

    const availableTruck = { truck_id: 5, truck_type_id: 2, is_available: true };
    mockTruckRepo.findAvailableTrucks.mockResolvedValue([availableTruck]);
    mockTruckRepo.findAll.mockResolvedValue([availableTruck]);

    const createdLogistics = { logistics_details_id: 55, scheduled_time: now, logistics_status: 'SCHEDULED' };
    mockLogisticsRepo.create.mockResolvedValue(createdLogistics);

    mockTruckAllocRepo.create.mockResolvedValue({ allocation_id: 9, truck_id: availableTruck.truck_id });

    mockTimeManager.getRealWorldPickupTimestamp.mockReturnValue(new Date(now.getTime() + 60000));
    mockTimeManager.getRealWorldDeliveryTimestamp.mockReturnValue(new Date(now.getTime() + 120000));

    const result = await (service as any).assignPickupToTruckAndSchedule(pickupId, quantity, now);

    expect(mockLogisticsRepo.create).toHaveBeenCalled();
    expect(mockTruckAllocRepo.create).toHaveBeenCalledWith(
      createdLogistics.logistics_details_id,
      availableTruck.truck_id
    );
    expect(result.logistics_details_id).toBe(createdLogistics.logistics_details_id);
  });

  it('notifyExternalPickup - calls company-specific URL and sends JSON body on success', async () => {
    // arrange
    mockedFetch.mockResolvedValueOnce({ ok: true });

    // act
    await expect(service.notifyExternalPickup('REF1', 2, 'pear-company', 'ModelX', 'John')).resolves.toBeUndefined();

    // assert fetch called with POST and JSON body containing the reference
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOpts] = mockedFetch.mock.calls[0];
    expect(typeof calledUrl).toBe('string');
    expect(calledOpts).toBeDefined();
    expect(calledOpts.method).toBe('POST');
    expect(typeof calledOpts.body).toBe('string');
    expect(calledOpts.body).toContain('REF1');
    expect(calledOpts.headers).toBeDefined();
  });

  it('notifyExternalPickup - throws when external API responds non-ok', async () => {
    // arrange: external API returns non-ok
    mockedFetch.mockResolvedValueOnce({ ok: false, status: 502, statusText: 'Bad Gateway' });

    // act & assert
    await expect(service.notifyExternalPickup('REF2', 3, 'unknown-company', 'ModelY')).rejects.toThrow(/Failed to notify external pickup API/i);

    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

});