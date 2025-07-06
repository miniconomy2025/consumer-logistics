import { TimeManager } from '../TimeManager';
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

    await new Promise((r) => setTimeout(r, 2000));
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
    const now = new Date();
    const currentTime = manager.getCurrentTime();
    expect(Math.abs(currentTime.getTime() - now.getTime())).toBeLessThan(1000);
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
  });

  it('should allow resetting sync failure count', () => {
    const manager = TimeManager.getInstance();
    
    manager.resetSyncFailureCount();
    const status = manager.getSyncStatus();
    
    expect(status.failedAttempts).toBe(0);
  });
});
