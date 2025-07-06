import { TimeManager } from '../services/TimeManagementService';

// This file is for demonstration purposes only and should not be used in production.
// To run this demo, use the following command:
// npx ts-node src/demo/demoTimeManager.ts
// We should remove this once we are done testing the TimeManager functionality with the hands endpoint.

async function main() {
  const manager = TimeManager.getInstance();
  
  const simulationStartTime = new Date('2025-07-06T08:00:00Z');
  const syncEndpoint = null; // Optional sync endpoint
  
  if (syncEndpoint) {
    console.log(`Starting simulation with auto-sync to: ${syncEndpoint}`);
    manager.startSimulation(simulationStartTime, syncEndpoint);
  } else {
    console.log('Starting simulation without auto-sync');
    manager.startSimulation(simulationStartTime);
  }

  console.log('Simulation started. Logging simulated time every 10 seconds...\n');
  console.log('Real Start Time:', new Date().toISOString());
  console.log('Simulation Start Time:', manager.getSimulationStartTime().toISOString());
  console.log('Initial Simulated Time:', manager.getCurrentTime().toISOString());
  console.log('Simulation Speed:', `${manager.getSimulationSpeed()}x real time`);

  const syncStatus = manager.getSyncStatus();
  console.log('Auto-sync enabled:', syncStatus.enabled);
  if (syncStatus.endpoint) {
    console.log('Sync endpoint:', syncStatus.endpoint);
    console.log('Sync will retry every 30 seconds on failures');
  }
  console.log('');

  const interval = setInterval(() => {
    const simTime = manager.getCurrentTime();
    const realElapsed = Date.now() - manager.getRealStartTime().getTime();
    const status = manager.getSyncStatus();
    
    let syncIndicator = status.enabled ? '[SYNC]' : '[LOCAL]';
    
    console.log(`${syncIndicator} [${Math.floor(realElapsed / 1000)}s] Simulated Time: ${simTime.toISOString()}`);
    
    if (status.failedAttempts > 0) {
      console.log(`  └─ Sync failures: ${status.failedAttempts} (continuing to retry)`);
    }
  }, 10000);

  setTimeout(async () => {
    clearInterval(interval);
    console.log('\n--- Demo Complete ---');
    console.log('Final Simulated Time:', manager.getCurrentTime().toISOString());
    console.log('Real Time at End:', new Date().toISOString());
    console.log('Simulation Speed:', `${manager.getSimulationSpeed()}x real time`);
    
    manager.stopSimulation();
    console.log('Simulation stopped.');
    process.exit(0);
  }, 120000); // 2 minutes demo duration
}

main().catch(console.error);