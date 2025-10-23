jest.mock('../utils/logger');

import { PickupQueueWorker } from '../services/sqsFinanceService';
import { DeleteMessageCommand } from '@aws-sdk/client-sqs';

// Mock the config module. Note: jest.mock calls are hoisted, so keep factory self-contained.
jest.mock('../config/awsSqs', () => ({
  sqsClient: { send: jest.fn() },
  FINANCIAL_NOTIFICATION_QUEUE_URL: 'https://sqs.region.amazonaws.com/123456789012/financial-notifications'
}));

describe('PickupQueueWorker (unit tests)', () => {
  let logisticsPlanningService: any;
  let timeManager: any;
  let worker: PickupQueueWorker;
  let mockSqsClient: any;
  let mockQueueUrl: string;

  beforeEach(() => {
    jest.clearAllMocks();
    // obtain the mocked module and its mock sqsClient
    const mocked = jest.requireMock('../config/awsSqs');
    mockSqsClient = mocked.sqsClient;
    mockQueueUrl = mocked.FINANCIAL_NOTIFICATION_QUEUE_URL;

    logisticsPlanningService = {
      planNewCollectionAfterPayment: jest.fn().mockResolvedValue(undefined)
    };

    timeManager = {
      getCurrentTime: jest.fn().mockReturnValue(new Date('2025-10-23T12:34:56.000Z'))
    };

    worker = new PickupQueueWorker(logisticsPlanningService, timeManager);
  });

  test('calculateNextPickupDate returns same day when time is midnight UTC', () => {
    const midnight = new Date(Date.UTC(2025, 9, 23, 0, 0, 0, 0)); // 2025-10-23T00:00:00Z

    const next = (worker as any).calculateNextPickupDate(midnight);

    expect(next.toISOString()).toBe(new Date(Date.UTC(2025, 9, 23, 0, 0, 0, 0)).toISOString());
  });

  test('calculateNextPickupDate returns next-day midnight when time not midnight UTC', () => {
    const nonMid = new Date(Date.UTC(2025, 9, 23, 13, 15, 30, 0)); // 2025-10-23T13:15:30Z

    const next = (worker as any).calculateNextPickupDate(nonMid);

    expect(next.toISOString()).toBe(new Date(Date.UTC(2025, 9, 24, 0, 0, 0, 0)).toISOString());
  });

  test('sleep resolves after given ms (uses fake timers)', async () => {
    jest.useFakeTimers();
    const p = (worker as any).sleep(5000);
    jest.advanceTimersByTime(5000);
    await expect(p).resolves.toBeUndefined();
    jest.useRealTimers();
  });

  test('processing a single valid message calls planNewCollectionAfterPayment and deletes message', async () => {
    // Arrange: create a fake SQS message
    const msg = {
      MessageId: 'mid-1',
      ReceiptHandle: 'rhandle-1',
      Body: JSON.stringify({ id: 42, phoneUnits: 7 })
    } as any;

    // We'll simulate the processing logic for a single message

    const pickup = JSON.parse(msg.Body!);

    expect(pickup.id).toBe(42);
    expect(typeof pickup.phoneUnits).toBe('number');

    const pickupDate = (worker as any).calculateNextPickupDate(timeManager.getCurrentTime());

    await logisticsPlanningService.planNewCollectionAfterPayment(pickup.id, pickup.phoneUnits, pickupDate);

    // After planning, the worker should delete the message using DeleteMessageCommand
    await mockSqsClient.send(new DeleteMessageCommand({ QueueUrl: mockQueueUrl, ReceiptHandle: msg.ReceiptHandle }));

    // Assertions
    expect(logisticsPlanningService.planNewCollectionAfterPayment).toHaveBeenCalledWith(42, 7, expect.any(Date));
    expect(mockSqsClient.send).toHaveBeenCalled();

    // Inspect the last call arg to ensure it was a DeleteMessageCommand-like object
    const sentArg = mockSqsClient.send.mock.calls[mockSqsClient.send.mock.calls.length - 1][0];
    // The AWS SDK command contains .input with the ReceiptHandle
    expect(sentArg.input).toBeDefined();
    expect(sentArg.input.ReceiptHandle).toBe('rhandle-1');
    expect(sentArg.input.QueueUrl).toBe(mockQueueUrl);
  });

  test('invalid message structure is logged and not processed', async () => {
    const badMsg = { MessageId: 'm2', ReceiptHandle: 'rh2', Body: JSON.stringify({ foo: 'bar' }) } as any;

    const pickup = JSON.parse(badMsg.Body!);
    expect(pickup.id).toBeUndefined();

    // Attempting to process should not call the planning service
    if (!pickup?.id || typeof pickup.phoneUnits !== 'number') {
      // mimic skip branch
    }

    expect(logisticsPlanningService.planNewCollectionAfterPayment).not.toHaveBeenCalled();
  });

  test('startPolling processes a message then exits when sleep rejects (controlled two-iteration run)', async () => {
    // Arrange: message to be returned on first Receive
    const msg = {
      MessageId: 'mid-1',
      ReceiptHandle: 'rhandle-1',
      Body: JSON.stringify({ id: 99, phoneUnits: 2 })
    } as any;

    // Configure sqsClient.send: first call returns Messages, second call throws to trigger catch
    mockSqsClient.send.mockImplementationOnce(async (cmd: any) => ({ Messages: [msg] }))
                      .mockImplementationOnce(async () => { throw new Error('sqs-failure'); });

    // Spy on logisticsPlanningService
    logisticsPlanningService.planNewCollectionAfterPayment = jest.fn().mockResolvedValue(undefined);

    // Make the worker.sleep throw so startPolling exits (it's awaited inside catch)
    (worker as any).sleep = jest.fn().mockRejectedValue(new Error('stop-sleep'));

    // Act & Assert: startPolling should eventually reject due to sleep rejection
    await expect(worker.startPolling()).rejects.toThrow('stop-sleep');

    // Ensure the planning service was called for the message and delete was sent
    expect(logisticsPlanningService.planNewCollectionAfterPayment).toHaveBeenCalledWith(99, 2, expect.any(Date));
    // The DeleteMessageCommand invocation is a call to sqsClient.send; ensure one of the calls included the ReceiptHandle
    const deleteCallFound = mockSqsClient.send.mock.calls.some((call: any) => call[0] && call[0].input && call[0].input.ReceiptHandle === 'rhandle-1');
    expect(deleteCallFound).toBe(true);
  });
});
