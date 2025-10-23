jest.mock('../utils/logger');
jest.mock('axios');

const axios = require('axios');

import { TimeManager } from '../services/timeManager';

describe('TimeManager', () => {
  beforeEach(() => {
    // ensure fresh singleton per test
    (TimeManager as any).instance = undefined;
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  afterEach(() => {
    const tm = TimeManager.getInstance();
    try {
      tm.stopSimulation();
      tm.reset();
    } catch (e) {}
    jest.useRealTimers();
  });

  it('getInstance returns a singleton and getSimulationSpeed is 720', () => {
    const a = TimeManager.getInstance();
    const b = TimeManager.getInstance();
    expect(a).toBe(b);
    expect(a.getSimulationSpeed()).toBe(720);
  });

  it('setSimulationTime updates current time and simulation start time', () => {
    const tm = TimeManager.getInstance();
    const newTime = new Date('2050-01-10T12:00:00.000Z');
    tm.setSimulationTime(newTime);

    expect(tm.getCurrentTime().toISOString()).toBe(newTime.toISOString());
    expect(tm.getSimulationStartTime().toISOString()).toBe(newTime.toISOString());
  });

  it('onBeforeMidnight callback fires when simTime is 23:59', () => {
    const tm = TimeManager.getInstance();
    const cb = jest.fn();
    tm.onBeforeMidnight(cb);

    // set time to 2050-01-02T23:59:30Z
    tm.setSimulationTime(new Date(Date.UTC(2050, 0, 2, 23, 59, 0, 0)));

    // call the internal checker directly
    (tm as any).checkAndTriggerTimeEvents();

    expect(cb).toHaveBeenCalledTimes(1);
    const calledWith: Date = cb.mock.calls[0][0];
    expect(calledWith.getUTCHours()).toBe(23);
    expect(calledWith.getUTCMinutes()).toBe(59);
  });

  it('onMidnight callback fires when date changes and time is 00:00', () => {
    const tm = TimeManager.getInstance();
    const cb = jest.fn();
    tm.onMidnight(cb);

    // Set the simulation time to the midnight we want to test
    tm.setSimulationTime(new Date(Date.UTC(2050, 0, 3, 0, 0, 0, 0)));
    // simulate that the "last triggered day" was the previous day so the midnight callback should fire
    (tm as any).lastSimDateString = '2050-01-02';

    (tm as any).checkAndTriggerTimeEvents();

    expect(cb).toHaveBeenCalledTimes(1);
    const calledWith: Date = cb.mock.calls[0][0];
    expect(calledWith.getUTCHours()).toBe(0);
    expect(calledWith.getUTCMinutes()).toBe(0);
  });

  it('syncTime updates simTime on success and increases failed count on failure', async () => {
    const tm = TimeManager.getInstance();
    const endpoint = 'https://time.example/sync';

    // success case
    const simTime = new Date('2050-01-05T00:00:00.000Z');
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: { currentSimTime: simTime } });

    await tm.syncTime(endpoint);
    expect(tm.getCurrentTime().toISOString()).toBe(simTime.toISOString());

    // failure case
    (axios.get as jest.Mock).mockRejectedValueOnce(new Error('network'));
    const prevFailed = (tm as any).failedSyncCount;
    await tm.syncTime(endpoint);
    expect((tm as any).failedSyncCount).toBeGreaterThanOrEqual(prevFailed + 1);
  });

  it('getSyncStatus and resetSyncFailureCount behavior', () => {
    const tm = TimeManager.getInstance();
    // set internal values
    (tm as any).syncEndpoint = 'https://time.example/sync';
    (tm as any).failedSyncCount = 2;

    const statusBefore = tm.getSyncStatus();
    expect(statusBefore.enabled).toBe(true);
    expect(statusBefore.endpoint).toBe('https://time.example/sync');

    tm.resetSyncFailureCount();
    const statusAfter = tm.getSyncStatus();
    expect(statusAfter.failedAttempts).toBe(0);
  });
});
