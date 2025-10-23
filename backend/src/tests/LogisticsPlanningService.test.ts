jest.mock('node-fetch', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../config/awsSqs', () => ({
  SQS_PICKUP_QUEUE_URL: 'https://sqs.region.amazonaws.com/123456789012/pickup-queue',
  SQS_DELIVERY_QUEUE_URL: 'https://sqs.region.amazonaws.com/123456789012/delivery-queue',
  sqsClient: {}
}));

const mockedFetch = require('node-fetch').default as jest.Mock;

import { ServiceTypeEnum } from '../database/models/ServiceTypeEntity';
import { LogisticsStatus } from '../database/models/LogisticsDetailsEntity';
import { PickupStatusEnum } from '../database/models/PickupEntity';
import { LogisticsPlanningService } from '../services/logisticsPlanningService';
import { AppDataSource } from '../database/config';

describe('LogisticsPlanningService', () => {
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

    mockLogisticsRepo = {
      update: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findActiveLogisticsForTruckOnDay: jest.fn().mockResolvedValue([])
    };
    mockTruckRepo = {
      findAll: jest.fn(),
      findAvailableTrucks: jest.fn(),
      findById: jest.fn()
    };
    mockPickupRepo = { findById: jest.fn() };
    mockTruckAllocRepo = {
      create: jest.fn(),
      findByLogisticsDetailId: jest.fn()
    };
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

  it('planNewCollection - throws deprecated method error', async () => {
    await expect(service.planNewCollection({
      pickupId: 1,
      serviceTypeId: ServiceTypeEnum.COLLECTION,
      scheduledSimulationDate: new Date(),
      quantity: 1
    })).rejects.toThrow(/deprecated planning method/i);
  });

  it('planNewCollectionAfterPayment - completes planning with truck assignment and SQS message', async () => {
    const pickupId = 11;
    const quantity = 5;
    const initialSimDate = new Date();

    mockPickupRepo.findById.mockResolvedValue({ pickup_id: pickupId, logisticsDetails: null });

    const scheduled = {
      logistics_details_id: 999,
      scheduled_time: new Date(),
      scheduled_real_pickup_timestamp: new Date(Date.now() + 60_000)
    };
    jest.spyOn(service as any, 'assignPickupToTruckAndSchedule').mockResolvedValue(scheduled);
    mockLogisticsRepo.update.mockResolvedValue({ ...scheduled, logistics_status: LogisticsStatus.QUEUED_FOR_COLLECTION });
    mockTimeManager.getRealWorldPickupTimestamp.mockReturnValue(new Date(Date.now() + 60_000));

    const result = await service.planNewCollectionAfterPayment(pickupId, quantity, initialSimDate);

    expect((service as any).assignPickupToTruckAndSchedule).toHaveBeenCalledWith(
      pickupId, quantity, expect.any(Date), undefined, undefined
    );
    expect(mockLogisticsRepo.update).toHaveBeenCalledWith(
      scheduled.logistics_details_id,
      expect.objectContaining({ logistics_status: LogisticsStatus.QUEUED_FOR_COLLECTION })
    );
    expect(mockPickupService.updatePickupStatus).toHaveBeenCalledWith(
      pickupId, 
      PickupStatusEnum.READY_FOR_COLLECTION
    );
    expect(result.logistics_details_id).toBe(scheduled.logistics_details_id);
  });

  it('assignPickupToTruckAndSchedule - marks NO_TRUCKS_AVAILABLE when no trucks found', async () => {
    const pickupId = 22;
    const quantity = 10;

    mockPickupRepo.findById.mockResolvedValue({ pickup_id: pickupId, total_weight: 200, logisticsDetails: null });
    mockTruckRepo.findAvailableTrucks.mockResolvedValue([]);
    mockTruckRepo.findAll.mockResolvedValue([]);
    mockLogisticsRepo.create.mockResolvedValue({ 
      logistics_details_id: 88,
      logistics_status: LogisticsStatus.NO_TRUCKS_AVAILABLE
    });

    await expect((service as any).assignPickupToTruckAndSchedule(pickupId, quantity, new Date()))
      .rejects.toThrow(/no available trucks/i);

    expect(mockLogisticsRepo.create).toHaveBeenCalled();
    expect(mockPickupService.updatePickupStatus).toHaveBeenCalledWith(
      pickupId,
      PickupStatusEnum.FAILED
    );
  });

  it('sendPickupMessageToSQS - throws when SQS client fails', async () => {
    mockSqsClient.send.mockRejectedValue(new Error('SQS down'));
    await expect((service as any).sendPickupMessageToSQS(123, 0))
      .rejects.toThrow(/Failed to queue logistics pickup event/i);
    const sendCmd = mockSqsClient.send.mock.calls[0][0];
    expect(sendCmd.input.QueueUrl).toContain('pickup-queue');
    expect(sendCmd.input.MessageBody).toContain('"eventType":"COLLECTION_SCHEDULED"');
  });

  it('sendPickupMessageToSQS - success path sends message with correct QueueUrl and payload', async () => {
    mockSqsClient.send.mockResolvedValueOnce({});
    const logisticsId = 123;
    const requestedDelay = 10;
    await expect((service as any).sendPickupMessageToSQS(logisticsId, requestedDelay)).resolves.toBeUndefined();
    const sendCmd = mockSqsClient.send.mock.calls[0][0];
    expect(sendCmd.input.QueueUrl).toContain('pickup-queue');
    expect(sendCmd.input.MessageBody).toContain(`"logisticsDetailsId":${logisticsId}`);
    expect(sendCmd.input.DelaySeconds).toBe(requestedDelay);
  });

  it('sendDeliveryMessageToSQS - throws when logistics detail not found', async () => {
    mockLogisticsRepo.findById.mockResolvedValue(null);
    await expect(service.sendDeliveryMessageToSQS(999, 0))
      .rejects.toThrow(/Logistics detail .* or its pickup not found/i);
  });

  it('sendDeliveryMessageToSQS - success path includes model name and quantity', async () => {
    const detail = { 
      logistics_details_id: 888,
      pickup: { model_name: 'TestModel' },
      quantity: 5
    };
    mockLogisticsRepo.findById.mockResolvedValue(detail);
    mockSqsClient.send.mockResolvedValueOnce({});

    await service.sendDeliveryMessageToSQS(detail.logistics_details_id, 30);

    const sendCmd = mockSqsClient.send.mock.calls[0][0];
    expect(sendCmd.input.QueueUrl).toContain('delivery-queue');
    expect(JSON.parse(sendCmd.input.MessageBody)).toEqual({
      eventType: 'DELIVERY_SCHEDULED',
      logisticsDetailsId: detail.logistics_details_id,
      modelName: detail.pickup.model_name,
      quantity: detail.quantity
    });
  });

  it('markAsCollected - throws when logistics detail not found', async () => {
    mockLogisticsRepo.findById.mockResolvedValue(null);
    await expect(service.markAsCollected(777))
      .rejects.toThrow(/Logistics detail with ID .* not found/i);
  });

  it('markAsCollected - throws when truck allocation missing', async () => {
    const detail = { 
      logistics_details_id: 666,
      pickup: { pickup_id: 55 }
    };
    mockLogisticsRepo.findById.mockResolvedValue(detail);
    mockTruckAllocRepo.findByLogisticsDetailId.mockResolvedValue(null);
    await expect(service.markAsCollected(detail.logistics_details_id))
      .rejects.toThrow(/No truck found for logistics detail/i);
  });

  it('markAsCollected - updates status and notifies when pickup has model', async () => {
    const detail = {
      logistics_details_id: 555,
      pickup: {
        pickup_id: 44,
        company: { company_name: 'TestCo' },
        model_name: 'ModelY',
        customer_name: 'John',
        invoice: { reference_number: 'REF-123' }
      },
      quantity: 2,
      scheduled_time: new Date(),
      truckAllocations: [{ truck: { truck_id: 3, truckType: { truck_type_name: 'Big' } } }]
    };
    mockLogisticsRepo.findById.mockResolvedValue(detail);
    mockTruckAllocRepo.findByLogisticsDetailId.mockResolvedValue({ truck_id: 3 });
    mockTruckRepo.findById.mockResolvedValue({ truck_id: 3, is_available: true });
    mockLogisticsRepo.update.mockResolvedValue({ ...detail, logistics_status: LogisticsStatus.COLLECTED });
    mockedFetch.mockResolvedValueOnce({ ok: true });

    await service.markAsCollected(detail.logistics_details_id);

    expect(mockLogisticsRepo.update).toHaveBeenCalledWith(
      detail.logistics_details_id,
      { logistics_status: LogisticsStatus.COLLECTED }
    );
    expect(mockPickupService.updatePickupStatus).toHaveBeenCalledWith(
      detail.pickup.pickup_id,
      expect.anything()
    );
    expect(mockedFetch).toHaveBeenCalled();
  });

  it('markAsDelivered - throws when logistics detail not found', async () => {
    mockLogisticsRepo.findById.mockResolvedValue(null);
    await expect(service.markAsDelivered(888))
      .rejects.toThrow(/Logistics detail with ID .* not found/i);
  });

  it('markAsDelivered - throws when truck allocation missing', async () => {
    const detail = { 
      logistics_details_id: 777,
      pickup: { pickup_id: 66 }
    };
    mockLogisticsRepo.findById.mockResolvedValue(detail);
    mockTruckAllocRepo.findByLogisticsDetailId.mockResolvedValue(null);
    await expect(service.markAsDelivered(detail.logistics_details_id))
      .rejects.toThrow(/No truck allocation found for delivery/i);
  });

  it('markAsDelivered - throws when truck not found', async () => {
    const detail = { 
      logistics_details_id: 666,
      pickup: { pickup_id: 77 }
    };
    mockLogisticsRepo.findById.mockResolvedValue(detail);
    mockTruckAllocRepo.findByLogisticsDetailId.mockResolvedValue({ truck_id: 99 });
    mockTruckRepo.findById.mockResolvedValue(null);
    await expect(service.markAsDelivered(detail.logistics_details_id))
      .rejects.toThrow(/Allocated truck record not found for delivery/i);
  });

  it('markAsDelivered - updates status and notifies when model and reference exist', async () => {
    const detail = {
      logistics_details_id: 555,
      pickup: {
        pickup_id: 44,
        company: { company_name: 'TestCo' },
        model_name: 'ModelY',
        invoice: { reference_number: 'REF-123' },
        customer_name: 'John'
      },
      quantity: 3,
      scheduled_time: new Date(),
      truckAllocations: [{ truck: { truck_id: 3, truckType: { truck_type_name: 'Big' } } }]
    };
    mockLogisticsRepo.findById.mockResolvedValue(detail);
    mockTruckAllocRepo.findByLogisticsDetailId.mockResolvedValue({ truck_id: 3 });
    mockTruckRepo.findById.mockResolvedValue({ truck_id: 3, is_available: true });
    mockLogisticsRepo.update.mockResolvedValue({ ...detail, logistics_status: LogisticsStatus.DELIVERED });
    mockedFetch.mockResolvedValueOnce({ ok: true });

    await service.markAsDelivered(detail.logistics_details_id);

    expect(mockLogisticsRepo.update).toHaveBeenCalledWith(
      detail.logistics_details_id,
      { logistics_status: LogisticsStatus.DELIVERED }
    );
    expect(mockPickupService.updatePickupStatus).toHaveBeenCalledWith(
      detail.pickup.pickup_id,
      expect.anything()
    );
    expect(mockedFetch).toHaveBeenCalled();
  });

  it('reassignTruckForLogistics - throws when logistics not found', async () => {
    mockLogisticsRepo.findById.mockResolvedValue(null);
    await expect(service.reassignTruckForLogistics(999))
      .rejects.toThrow(/Logistics detail .* or its pickup not found for reassignment/i);
  });

  it('reassignTruckForLogistics - deletes current allocation and creates new', async () => {
    const originalLogistics = {
      logistics_details_id: 888,
      pickup: { pickup_id: 77 },
      quantity: 2
    };
    const currentAllocation = { truck_id: 5 };
    const newLogistics = {
      ...originalLogistics,
      scheduled_time: new Date(),
      truckAllocations: [{ truck_id: 6 }]
    };

    mockLogisticsRepo.findById.mockResolvedValue(originalLogistics);
    mockTruckAllocRepo.findByLogisticsDetailId.mockResolvedValue(currentAllocation);
    jest.spyOn(service as any, 'assignPickupToTruckAndSchedule').mockResolvedValue(newLogistics);
    mockTimeManager.getCurrentTime.mockReturnValue(new Date());
    mockTimeManager.getRealWorldPickupTimestamp.mockReturnValue(new Date(Date.now() + 60000));

    const result = await service.reassignTruckForLogistics(originalLogistics.logistics_details_id, currentAllocation.truck_id);

    expect(AppDataSource.getRepository).toHaveBeenCalled();
    expect((service as any).assignPickupToTruckAndSchedule).toHaveBeenCalledWith(
      originalLogistics.pickup.pickup_id,
      originalLogistics.quantity,
      expect.any(Date),
      currentAllocation.truck_id,
      originalLogistics.logistics_details_id
    );
    expect(result).toBe(newLogistics);
  });

  it('assignPickupToTruckAndSchedule - fails after max attempts', async () => {
    const pickupId = 44;
    const quantity = 3;

    // Setup initial pickup and truck data
    mockPickupRepo.findById.mockResolvedValue({ pickup_id: pickupId, total_weight: 100 });
    mockTruckRepo.findAvailableTrucks.mockResolvedValue([]); // No trucks available ever
    mockTruckRepo.findAll.mockResolvedValue([]);
    mockLogisticsRepo.create.mockResolvedValue({ 
      logistics_details_id: 888,
      logistics_status: LogisticsStatus.NO_TRUCKS_AVAILABLE
    });

    await expect((service as any).assignPickupToTruckAndSchedule(pickupId, quantity, new Date()))
      .rejects.toThrow(/no available trucks/i);
    
    expect(mockLogisticsRepo.create).toHaveBeenCalled();
    expect(mockPickupService.updatePickupStatus).toHaveBeenCalledWith(
      pickupId,
      PickupStatusEnum.FAILED
    );
  });

  it('planAlternativeDelivery - throws when no trucks available', async () => {
    const originalLogistics = {
      logistics_details_id: 777,
      pickup: { pickup_id: 66 },
      quantity: 1
    };
    mockLogisticsRepo.findById.mockResolvedValue(originalLogistics);
    mockTruckRepo.findAll.mockResolvedValue([]);

    await expect(service.planAlternativeDelivery(originalLogistics.logistics_details_id))
      .rejects.toThrow(/No available trucks/i);
  });

  it('replanPendingOrFailed - processes failed logistics in batches', async () => {
    const failedDetails = [
      { 
        logistics_details_id: 111, 
        logistics_status: LogisticsStatus.FAILED,
        pickup: { pickup_id: 1 }
      },
      { 
        logistics_details_id: 222, 
        logistics_status: LogisticsStatus.PENDING_REPLANNING,
        pickup: { pickup_id: 2 }
      }
    ];
    mockLogisticsRepo.find.mockResolvedValue(failedDetails);
    const spy = jest.spyOn(service, 'reassignTruckForLogistics');
    spy.mockImplementation(async (id) => ({
      logistics_details_id: id,
      logistics_status: LogisticsStatus.QUEUED_FOR_COLLECTION
    } as any));

    await service.replanPendingOrFailed();

    expect(spy).toHaveBeenCalledTimes(failedDetails.length);
    failedDetails.forEach(detail => {
      expect(spy).toHaveBeenCalledWith(detail.logistics_details_id);
    });
  });

  it('notifyExternalDelivery - includes recipient when provided', async () => {
    mockedFetch.mockResolvedValueOnce({ ok: true });
    const recipient = 'Alice';
    await service.notifyExternalDelivery('REF3', 1, 'test-co', 'ModelZ', recipient);

    const [_, opts] = mockedFetch.mock.calls[0];
    expect(opts).toBeDefined();
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(opts.body);
    expect(body).toEqual({
      delivery_reference: 'REF3',
      quantity: 1,
      companyName: 'test-co',
      modelName: 'ModelZ',
      recipient: recipient,
      status: 'delivered'
    });
  });

  it('notifyExternalDelivery - throws when fetch fails', async () => {
    mockedFetch.mockResolvedValueOnce({ ok: false, statusText: 'Internal Server Error' });
    await expect(service.notifyExternalDelivery('REF4', 2, 'test-co', 'ModelZ'))
      .rejects.toThrow(/Failed to notify external delivery API for test-co/);
  });
});
