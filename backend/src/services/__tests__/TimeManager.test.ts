import { TimeManager } from '../timeManagementService';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TimeManager Singleton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    const manager = TimeManager.getInstance();
    manager.stopSimulation();
  });

  it('should return the same instance', () => {
    const instance1 = TimeManager.getInstance();
    const instance2 = TimeManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should start simulation and advance simulated time', async () => {
    const manager = TimeManager.getInstance();
    const startTime = new Date('2023-01-01T00:00:00Z');
    manager.startSimulation(startTime);
    
    const initialTime = manager.getCurrentTime().getTime();
    expect(manager.isSimulationRunning()).toBe(true);

    // Wait a bit to ensure real time has passed
    await new Promise((r) => setTimeout(r, 2000));
    
    // Now when we call getCurrentTime(), it should calculate the new time
    const advancedTime = manager.getCurrentTime().getTime();

    expect(advancedTime).toBeGreaterThan(initialTime);
    expect(manager.getSimulationStartTime().getTime()).toBe(startTime.getTime());
  });

  it('should sync time from external endpoint', async () => {
    const manager = TimeManager.getInstance();
    const simDate = new Date('2025-07-06T12:00:00Z');
    mockedAxios.get.mockResolvedValueOnce({
      data: { currentSimTime: simDate.toISOString() }
    });

    await manager.syncTime('http://fake-endpoint/sim-time');
    expect(manager.getCurrentTime().toISOString()).toBe(simDate.toISOString());
  });

  it('should throw error if sync fails', async () => {
    const manager = TimeManager.getInstance();
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
    await expect(manager.syncTime('http://fake-endpoint/sim-time')).rejects.toThrow('Failed to sync simulation time');
  });

  it('should allow setting simulation time manually', () => {
    const manager = TimeManager.getInstance();
    const newTime = new Date('2025-12-25T12:00:00Z');
    
    manager.setSimulationTime(newTime);
    
    expect(manager.getCurrentTime().getTime()).toBe(newTime.getTime());
    expect(manager.getSimulationStartTime().getTime()).toBe(newTime.getTime());
  });

  it('should reset simulation properly', () => {
    const manager = TimeManager.getInstance();
    manager.startSimulation(new Date('2023-01-01T00:00:00Z'));

    manager.reset();

    expect(manager.isSimulationRunning()).toBe(false);
    // After reset, should use default simulation start date (2050-01-01)
    const currentTime = manager.getCurrentTime();
    expect(currentTime.getFullYear()).toBe(2050);
    expect(currentTime.getMonth()).toBe(0); // January
    expect(currentTime.getDate()).toBe(1);
  });

  it('should return correct simulation speed', () => {
    const manager = TimeManager.getInstance();
    const expectedSpeed = (24 * 60 * 60 * 1000) / (2 * 60 * 1000); // 720x speed
    
    expect(manager.getSimulationSpeed()).toBe(expectedSpeed);
  });

  it('should enable auto-sync when sync endpoint is provided', () => {
    const manager = TimeManager.getInstance();
    const endpoint = 'http://test-endpoint/sync';
    
    manager.startSimulation(new Date(), endpoint);
    
    expect(manager.getSyncEndpoint()).toBe(endpoint);
    expect(manager.isSyncEnabled()).toBe(true);
  });

  it('should disable auto-sync when no endpoint is provided', () => {
    const manager = TimeManager.getInstance();
    
    manager.startSimulation(new Date());
    
    expect(manager.getSyncEndpoint()).toBe(null);
    expect(manager.isSyncEnabled()).toBe(false);
  });

  it('should handle sync failures gracefully', async () => {
    const manager = TimeManager.getInstance();
    const failingEndpoint = 'http://nonexistent-endpoint/sync';
    
    await expect(manager.syncTime(failingEndpoint)).rejects.toThrow('Failed to sync simulation time');
  });

  it('should provide detailed sync status', () => {
    const manager = TimeManager.getInstance();
    const endpoint = 'http://test-endpoint/sync';

    manager.startSimulation(new Date(), endpoint);
    const status = manager.getSyncStatus();

    expect(status.enabled).toBe(true);
    expect(status.endpoint).toBe(endpoint);
    expect(status.failedAttempts).toBe(0);
    expect(status.maxFailures).toBe(3);
    expect(status.lastSyncTime).toBeUndefined(); // No sync performed yet
  });

  it('should allow resetting sync failure count', () => {
    const manager = TimeManager.getInstance();

    manager.resetSyncFailureCount();
    const status = manager.getSyncStatus();

    expect(status.failedAttempts).toBe(0);
  });

  it('should update lastSyncTime after successful sync', async () => {
    const manager = TimeManager.getInstance();
    const simDate = new Date('2025-07-06T12:00:00Z');
    mockedAxios.get.mockResolvedValueOnce({
      data: { currentSimTime: simDate.toISOString() }
    });

    await manager.syncTime('http://fake-endpoint/sim-time');
    const status = manager.getSyncStatus();

    expect(status.lastSyncTime).toBeDefined();
    expect(status.lastSyncTime!.getTime()).toBeCloseTo(Date.now(), -2);
  });
});

describe('TimeManager Event System', () => {
  let manager: TimeManager;

  beforeEach(() => {
    manager = TimeManager.getInstance();
    manager.reset();
  });

  afterEach(() => {
    manager.stopSimulation();
  });

  it('should register midnight callbacks', () => {
    const mockCallback = jest.fn();
    manager.onMidnight(mockCallback);

    // Verify callback is registered (we can't easily test the actual trigger without complex timing)
    expect(manager['onMidnightCallbacks']).toContain(mockCallback);
  });

  it('should register pre-midnight callbacks', () => {
    const mockCallback = jest.fn();
    manager.onBeforeMidnight(mockCallback);

    // Verify callback is registered
    expect(manager['onBeforeMidnightCallbacks']).toContain(mockCallback);
  });

  it('should trigger midnight callbacks when time crosses 00:00', () => {
    const mockCallback = jest.fn();
    manager.onMidnight(mockCallback);

    // Manually trigger the time check method to test event logic
    manager['lastSimDateString'] = '2050-01-01'; // Set previous day
    manager['simTime'] = new Date('2050-01-02T00:00:00Z'); // Set current time to midnight of next day

    // Call the private method directly to test event triggering
    manager['checkAndTriggerTimeEvents']();

    expect(mockCallback).toHaveBeenCalledWith(expect.any(Date));
    const callArg = mockCallback.mock.calls[0][0];
    expect(callArg.getUTCHours()).toBe(0);
    expect(callArg.getUTCMinutes()).toBe(0);
  });

  it('should trigger pre-midnight callbacks at 23:59', () => {
    const mockCallback = jest.fn();
    manager.onBeforeMidnight(mockCallback);

    // Set time to 23:59
    manager['simTime'] = new Date('2050-01-01T23:59:30Z');

    // Call the private method directly
    manager['checkAndTriggerTimeEvents']();

    expect(mockCallback).toHaveBeenCalledWith(expect.any(Date));
    const callArg = mockCallback.mock.calls[0][0];
    expect(callArg.getUTCHours()).toBe(23);
    expect(callArg.getUTCMinutes()).toBe(59);
  });

  it('should handle callback errors gracefully', () => {
    const errorCallback = jest.fn(() => {
      throw new Error('Test callback error');
    });
    const normalCallback = jest.fn();

    manager.onMidnight(errorCallback);
    manager.onMidnight(normalCallback);

    // Set up for midnight trigger
    manager['lastSimDateString'] = '2050-01-01';
    manager['simTime'] = new Date('2050-01-02T00:00:00Z');

    // Should not throw despite error in callback
    expect(() => manager['checkAndTriggerTimeEvents']()).not.toThrow();

    expect(errorCallback).toHaveBeenCalled();
    expect(normalCallback).toHaveBeenCalled(); // Should still be called despite error
  });
});

describe('TimeManager Utility Methods', () => {
  let manager: TimeManager;

  beforeEach(() => {
    manager = TimeManager.getInstance();
    manager.reset();
  });

  afterEach(() => {
    manager.stopSimulation();
  });

  it('should convert simulation date to real-world timestamp', () => {
    const simStartTime = new Date('2050-01-01T00:00:00Z');
    manager.startSimulation(simStartTime);

    // Test conversion for a date 1 simulation day later
    const simDate = new Date('2050-01-02T00:00:00Z');
    const realWorldTime = manager.getRealWorldTimestampFromSimulationDate(simDate);

    // Should be 2 real minutes later (1 sim day = 2 real minutes)
    const expectedRealTime = new Date(manager.getRealStartTime().getTime() + (2 * 60 * 1000));
    expect(Math.abs(realWorldTime.getTime() - expectedRealTime.getTime())).toBeLessThan(1000);
  });

  it('should calculate pickup timestamp for start of simulation day', () => {
    const simStartTime = new Date('2050-01-01T12:30:45Z');
    manager.startSimulation(simStartTime);

    const simDate = new Date('2050-01-02T15:20:10Z');
    const pickupTime = manager.getRealWorldPickupTimestamp(simDate);

    // Should map to the start of the real-world day corresponding to 2050-01-02T00:00:00Z
    const expectedSimMidnight = new Date('2050-01-02T00:00:00Z');
    const expectedRealTime = manager.getRealWorldTimestampFromSimulationDate(expectedSimMidnight);

    expect(pickupTime.getTime()).toBe(expectedRealTime.getTime());
  });

  it('should calculate delivery timestamp for end of simulation day', () => {
    const simStartTime = new Date('2050-01-01T12:30:45Z');
    manager.startSimulation(simStartTime);

    const simDate = new Date('2050-01-02T15:20:10Z');
    const deliveryTime = manager.getRealWorldDeliveryTimestamp(simDate);

    // Should map to the end of the real-world day corresponding to 2050-01-02T23:59:59.999Z
    const expectedSimEndOfDay = new Date('2050-01-02T23:59:59.999Z');
    const expectedRealTime = manager.getRealWorldTimestampFromSimulationDate(expectedSimEndOfDay);

    expect(deliveryTime.getTime()).toBe(expectedRealTime.getTime());
  });
});
