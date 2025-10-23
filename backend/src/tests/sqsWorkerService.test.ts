jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { SQSWorkerService } from '../services/sqsWorkerService';
import { LogisticsStatus } from '../database/models/LogisticsDetailsEntity';
import { PickupStatusEnum } from '../database/models/PickupEntity';

describe('SQSWorkerService', () => {
  let mockSqsClient: any;
  let logisticsPlanningService: any;
  let timeManager: any;
  let pickupService: any;
  let service: SQSWorkerService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSqsClient = {
      send: jest.fn().mockResolvedValue({})
    };

    logisticsPlanningService = {
      markAsCollected: jest.fn(),
      markAsDelivered: jest.fn(),
      sendDeliveryMessageToSQS: jest.fn().mockResolvedValue(undefined),
      sendPickupMessageToSQS: jest.fn().mockResolvedValue(undefined),
      logisticsDetailsRepository: {
        findById: jest.fn(),
        update: jest.fn(),
        find: jest.fn()
      },
      planAlternativeDelivery: jest.fn(),
      reassignTruckForLogistics: jest.fn()
    };

    timeManager = {
      getRealWorldDeliveryTimestamp: jest.fn().mockReturnValue(new Date(Date.now() + 60000)),
      getCurrentTime: jest.fn().mockReturnValue(new Date()),
      onMidnight: jest.fn((cb: any) => {
        // allow tests to invoke stored callbacks if needed
        (timeManager as any)._midnightCb = cb;
      }),
      onBeforeMidnight: jest.fn((cb: any) => {
        (timeManager as any)._beforeMidnightCb = cb;
      }),
    };

    pickupService = {
      updatePickupStatus: jest.fn()
    };

    service = new SQSWorkerService(logisticsPlanningService, timeManager, pickupService, mockSqsClient);
  });

  it('processPickupMessage - success path queues delivery and deletes message', async () => {
    const msg = { Body: JSON.stringify({ eventType: 'COLLECTION_SCHEDULED', logisticsDetailsId: 101 }), ReceiptHandle: 'rh-1' } as any;

    const collected = { logistics_details_id: 101, logistics_status: LogisticsStatus.COLLECTED };
    const full = { logistics_details_id: 101, scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000) };

    logisticsPlanningService.markAsCollected.mockResolvedValue(collected);
    logisticsPlanningService.logisticsDetailsRepository.findById.mockResolvedValue(full);
    logisticsPlanningService.sendDeliveryMessageToSQS.mockResolvedValue(undefined);
    logisticsPlanningService.logisticsDetailsRepository.update.mockResolvedValue({ ...full, logistics_status: LogisticsStatus.QUEUED_FOR_DELIVERY });

    await (service as any).processPickupMessage(msg);

    expect(logisticsPlanningService.markAsCollected).toHaveBeenCalledWith(101);
    expect(logisticsPlanningService.sendDeliveryMessageToSQS).toHaveBeenCalledWith(101, expect.any(Number));

    // ensure delete was called via sqsClient.send with ReceiptHandle
    const args = mockSqsClient.send.mock.calls[mockSqsClient.send.mock.calls.length - 1][0];
    expect(args.input).toBeDefined();
    expect(args.input.ReceiptHandle).toBe('rh-1');
  });

  it('processPickupMessage - non-collected does not queue delivery but deletes message', async () => {
    const msg = { Body: JSON.stringify({ eventType: 'COLLECTION_SCHEDULED', logisticsDetailsId: 202 }), ReceiptHandle: 'rh-2' } as any;

    const collected = { logistics_details_id: 202, logistics_status: LogisticsStatus.PENDING_PLANNING };
    logisticsPlanningService.markAsCollected.mockResolvedValue(collected);

    await (service as any).processPickupMessage(msg);

    expect(logisticsPlanningService.markAsCollected).toHaveBeenCalledWith(202);
    expect(logisticsPlanningService.sendDeliveryMessageToSQS).not.toHaveBeenCalled();

    const args = mockSqsClient.send.mock.calls[mockSqsClient.send.mock.calls.length - 1][0];
    expect(args.input.ReceiptHandle).toBe('rh-2');
  });

  it('processDeliveryMessage - success path deletes message and logs delivery', async () => {
    const msg = { Body: JSON.stringify({ eventType: 'DELIVERY_SCHEDULED', logisticsDetailsId: 303 }), ReceiptHandle: 'rh-3' } as any;

    const delivered = { logistics_details_id: 303, logistics_status: LogisticsStatus.DELIVERED, truckAllocations: [{ truck_id: 7 }] };
    logisticsPlanningService.markAsDelivered.mockResolvedValue(delivered);

    await (service as any).processDeliveryMessage(msg);

    expect(logisticsPlanningService.markAsDelivered).toHaveBeenCalledWith(303);
    const args = mockSqsClient.send.mock.calls[mockSqsClient.send.mock.calls.length - 1][0];
    expect(args.input.ReceiptHandle).toBe('rh-3');
  });

  it('deleteMessageFromQueue - sends DeleteMessageCommand via sqsClient', async () => {
    await (service as any).deleteMessageFromQueue('https://queue.test/url', 'rhandle-x');
    expect(mockSqsClient.send).toHaveBeenCalled();
    const cmd = mockSqsClient.send.mock.calls[0][0];
    expect(cmd.input.QueueUrl).toBe('https://queue.test/url');
    expect(cmd.input.ReceiptHandle).toBe('rhandle-x');
  });

  it('handlePickupProcessingError - marks as FAILED when not in replanning statuses', async () => {
    const ld = { logistics_details_id: 404, pickup: { pickup_id: 55 }, logistics_status: LogisticsStatus.PENDING_PLANNING };
    logisticsPlanningService.logisticsDetailsRepository.findById.mockResolvedValue(ld);
    logisticsPlanningService.logisticsDetailsRepository.update.mockResolvedValue({ ...ld, logistics_status: LogisticsStatus.FAILED });

    await (service as any).handlePickupProcessingError(404, new Error('boom'));

    expect(logisticsPlanningService.logisticsDetailsRepository.update).toHaveBeenCalledWith(404, { logistics_status: LogisticsStatus.FAILED });
    expect(pickupService.updatePickupStatus).toHaveBeenCalledWith(55, PickupStatusEnum.FAILED);
  });

  it('reattemptFailedPlanning - no logistics to replan does nothing', async () => {
    logisticsPlanningService.logisticsDetailsRepository.find.mockResolvedValue([]);
    const spy = jest.spyOn(service as any, 'replanLogisticsDetail');
    await (service as any).reattemptFailedPlanning(new Date());
    expect(logisticsPlanningService.logisticsDetailsRepository.find).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });

  it('reattemptFailedPlanning - batches and replans found logistics', async () => {
    const items = [{ logistics_details_id: 1 }, { logistics_details_id: 2 }];
    logisticsPlanningService.logisticsDetailsRepository.find.mockResolvedValue(items);
    (service as any).replanLogisticsDetail = jest.fn().mockResolvedValue(undefined);
    await (service as any).reattemptFailedPlanning(new Date());
    expect((service as any).replanLogisticsDetail).toHaveBeenCalledTimes(items.length);
  });

  it('replanLogisticsDetail - calls planAlternativeDelivery for stuck statuses', async () => {
    const detail = { logistics_details_id: 11, pickup: { pickup_id: 22 }, logistics_status: LogisticsStatus.STUCK_IN_TRANSIT };
    logisticsPlanningService.planAlternativeDelivery.mockResolvedValue(undefined);
    await (service as any).replanLogisticsDetail(detail);
    expect(logisticsPlanningService.planAlternativeDelivery).toHaveBeenCalledWith(11);
  });

  it('replanLogisticsDetail - calls reassignTruckForLogistics for other statuses', async () => {
    const detail = { logistics_details_id: 12, pickup: { pickup_id: 33 }, logistics_status: LogisticsStatus.PENDING_PLANNING };
    logisticsPlanningService.reassignTruckForLogistics.mockResolvedValue(undefined);
    await (service as any).replanLogisticsDetail(detail);
    expect(logisticsPlanningService.reassignTruckForLogistics).toHaveBeenCalledWith(12);
  });

  it('processPickupMessage - parse error deletes message', async () => {
    const badMsg = { Body: 'not-json', ReceiptHandle: 'rh-parse' } as any;
    await (service as any).processPickupMessage(badMsg);
    // last send should be delete
    const last = mockSqsClient.send.mock.calls[mockSqsClient.send.mock.calls.length - 1][0];
    expect(last.input.ReceiptHandle).toBe('rh-parse');
  });

  it('processPickupMessage - markAsCollected throws triggers handlePickupProcessingError', async () => {
    const msg = { Body: JSON.stringify({ eventType: 'COLLECTION_SCHEDULED', logisticsDetailsId: 909 }), ReceiptHandle: 'rh-err' } as any;
    const boom = new Error('boom');
    logisticsPlanningService.markAsCollected.mockRejectedValue(boom);
    (service as any).handlePickupProcessingError = jest.fn().mockResolvedValue(undefined);

    await (service as any).processPickupMessage(msg);
    expect((service as any).handlePickupProcessingError).toHaveBeenCalledWith(909, expect.any(Error));
  });

  it('deleteMessageFromQueue - propagates error when sqs send fails', async () => {
    mockSqsClient.send.mockRejectedValueOnce(new Error('delete-failed'));
    await expect((service as any).deleteMessageFromQueue('q-url', 'rhand')).rejects.toThrow('delete-failed');
  });

  it('startPolling*Queue and getStatus toggle pollers', () => {
    service.startPollingPickupQueue();
    service.startPollingDeliveryQueue();
    const status = service.getStatus();
    expect(status.isRunning).toBeTruthy();
    expect(status.activePollers).toEqual(expect.arrayContaining(['pickup', 'delivery']));
  });

});
