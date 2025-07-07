import { TimeManager } from '../services/timeManagementService';

/**
 * Enhanced TimeManager Demo - Showcasing All Features
 *
 * This comprehensive demo demonstrates all the new features of the merged TimeManager:
 * - Event system (midnight/pre-midnight callbacks)
 * - Real-world time mapping utilities
 * - Enhanced sync status tracking
 * - Configurable update intervals
 * - Default simulation start date
 * - Error handling in callbacks
 *
 * To run this demo: npx ts-node src/demo/demoTimeManager.ts
 */

// Demo configuration
const DEMO_CONFIG = {
  // Start simulation close to midnight to quickly demonstrate events
  simulationStartTime: new Date('2050-01-01T23:58:30Z'), // 1.5 minutes before midnight
  updateInterval: 200, // Fast updates (200ms) for quick demo
  syncEndpoint: null, // Set to URL for sync demo: 'http://localhost:3000/api/simulation/time'
  demoDuration: 90000, // 90 seconds total demo
};

async function main() {
  console.log('🚀 Enhanced TimeManager Demo - Showcasing All Features\n');

  const manager = TimeManager.getInstance();

  // ========================================
  // 1. DEMONSTRATE EVENT SYSTEM
  // ========================================
  console.log('📅 Setting up Event System...');

  let midnightCount = 0;
  let preMidnightCount = 0;

  // Register midnight callback
  manager.onMidnight((simTime) => {
    midnightCount++;
    console.log(`🌙 MIDNIGHT EVENT #${midnightCount}: New simulation day started!`);
    console.log(`   └─ Simulation Time: ${simTime.toISOString()}`);
    console.log(`   └─ Real World Time: ${new Date().toISOString()}`);

    // Demonstrate real-world time mapping
    const realPickupTime = manager.getRealWorldPickupTimestamp(simTime);
    const realDeliveryTime = manager.getRealWorldDeliveryTimestamp(simTime);
    console.log(`   └─ Real pickup time for this sim day: ${realPickupTime.toISOString()}`);
    console.log(`   └─ Real delivery time for this sim day: ${realDeliveryTime.toISOString()}`);
  });

  // Register pre-midnight callback
  manager.onBeforeMidnight((simTime) => {
    preMidnightCount++;
    if (preMidnightCount === 1) { // Only log first occurrence to avoid spam
      console.log(`🌆 PRE-MIDNIGHT EVENT: Day ending soon (23:59)`);
      console.log(`   └─ Simulation Time: ${simTime.toISOString()}`);
    }
  });

  // Demonstrate error handling in callbacks
  manager.onMidnight((simTime) => {
    if (midnightCount === 2) { // Trigger error on second midnight
      console.log(`💥 Demonstrating error handling in callbacks...`);
      throw new Error('Demo callback error - this should be caught gracefully');
    }
  });

  console.log('✅ Event callbacks registered\n');

  // ========================================
  // 2. DEMONSTRATE ENHANCED INITIALIZATION
  // ========================================
  console.log('⚙️  Starting Enhanced Simulation...');
  console.log(`   └─ Start Time: ${DEMO_CONFIG.simulationStartTime.toISOString()}`);
  console.log(`   └─ Update Interval: ${DEMO_CONFIG.updateInterval}ms (configurable)`);
  console.log(`   └─ Sync Endpoint: ${DEMO_CONFIG.syncEndpoint || 'None (local mode)'}`);

  // Start simulation with configurable update interval
  if (DEMO_CONFIG.syncEndpoint) {
    manager.startSimulation(DEMO_CONFIG.simulationStartTime, DEMO_CONFIG.syncEndpoint, DEMO_CONFIG.updateInterval);
  } else {
    manager.startSimulation(DEMO_CONFIG.simulationStartTime, undefined, DEMO_CONFIG.updateInterval);
  }

  console.log('✅ Simulation started\n');

  // ========================================
  // 3. DISPLAY INITIAL STATUS
  // ========================================
  console.log('📊 Initial Status:');
  console.log(`   └─ Real Start Time: ${manager.getRealStartTime().toISOString()}`);
  console.log(`   └─ Simulation Start: ${manager.getSimulationStartTime().toISOString()}`);
  console.log(`   └─ Current Sim Time: ${manager.getCurrentTime().toISOString()}`);
  console.log(`   └─ Simulation Speed: ${manager.getSimulationSpeed()}x real time`);
  console.log(`   └─ Running: ${manager.isSimulationRunning()}`);

  // Enhanced sync status
  const initialSyncStatus = manager.getSyncStatus();
  console.log(`   └─ Sync Status:`);
  console.log(`       ├─ Enabled: ${initialSyncStatus.enabled}`);
  console.log(`       ├─ Endpoint: ${initialSyncStatus.endpoint || 'None'}`);
  console.log(`       ├─ Failed Attempts: ${initialSyncStatus.failedAttempts}`);
  console.log(`       ├─ Max Failures: ${initialSyncStatus.maxFailures}`);
  console.log(`       └─ Last Sync: ${initialSyncStatus.lastSyncTime?.toISOString() || 'Never'}`);
  console.log('');

  // ========================================
  // 4. DEMONSTRATE REAL-TIME MONITORING
  // ========================================
  console.log('⏱️  Real-time Monitoring (every 5 seconds):');
  console.log('   Format: [STATUS] [elapsed] Sim Time | Real mapping demo\n');

  const monitoringInterval = setInterval(() => {
    const simTime = manager.getCurrentTime();
    const realElapsed = Date.now() - manager.getRealStartTime().getTime();
    const status = manager.getSyncStatus();

    const statusIndicator = status.enabled ? 'SYNC' : 'LOCAL';
    const elapsedSeconds = Math.floor(realElapsed / 1000);

    console.log(`[${statusIndicator}] [${elapsedSeconds}s] ${simTime.toISOString()}`);

    // Demonstrate real-world time mapping utilities
    const realWorldEquivalent = manager.getRealWorldTimestampFromSimulationDate(simTime);
    console.log(`   └─ Real-world equivalent: ${realWorldEquivalent.toISOString()}`);

    // Show sync status if there are failures
    if (status.failedAttempts > 0) {
      console.log(`   └─ Sync failures: ${status.failedAttempts}/${status.maxFailures} (continuing to retry)`);
    }

    if (status.lastSyncTime) {
      console.log(`   └─ Last successful sync: ${status.lastSyncTime.toISOString()}`);
    }
  }, 5000);

  // ========================================
  // 5. DEMONSTRATE MANUAL TIME SETTING
  // ========================================
  setTimeout(() => {
    console.log('\n🔧 Demonstrating Manual Time Setting...');
    const newTime = new Date('2050-01-02T12:00:00Z'); // Next day at noon
    console.log(`   └─ Setting time to: ${newTime.toISOString()}`);

    manager.setSimulationTime(newTime);

    console.log(`   └─ New current time: ${manager.getCurrentTime().toISOString()}`);
    console.log(`   └─ New simulation start: ${manager.getSimulationStartTime().toISOString()}`);
    console.log('✅ Manual time setting demonstrated\n');
  }, 30000); // After 30 seconds

  // ========================================
  // 6. DEMONSTRATE RESET FUNCTIONALITY
  // ========================================
  setTimeout(() => {
    console.log('🔄 Demonstrating Reset to Default State...');
    console.log(`   └─ Current time before reset: ${manager.getCurrentTime().toISOString()}`);

    manager.reset();

    console.log(`   └─ Time after reset: ${manager.getCurrentTime().toISOString()}`);
    console.log(`   └─ Default start date: 2050-01-01T00:00:00.000Z`);
    console.log(`   └─ Running: ${manager.isSimulationRunning()}`);
    console.log('✅ Reset demonstrated\n');
  }, 60000); // After 60 seconds

  // ========================================
  // 7. DEMO COMPLETION
  // ========================================
  setTimeout(() => {
    clearInterval(monitoringInterval);

    console.log('\n🎯 Demo Summary:');
    console.log('✅ Event system (midnight/pre-midnight callbacks)');
    console.log('✅ Real-world time mapping utilities');
    console.log('✅ Enhanced sync status tracking');
    console.log('✅ Configurable update intervals');
    console.log('✅ Default simulation start date');
    console.log('✅ Error handling in callbacks');
    console.log('✅ Manual time setting');
    console.log('✅ Reset functionality');

    console.log('\n📈 Event Statistics:');
    console.log(`   └─ Midnight events triggered: ${midnightCount}`);
    console.log(`   └─ Pre-midnight events triggered: ${preMidnightCount}`);

    const finalStatus = manager.getSyncStatus();
    console.log('\n📊 Final Status:');
    console.log(`   └─ Final Sim Time: ${manager.getCurrentTime().toISOString()}`);
    console.log(`   └─ Real Time: ${new Date().toISOString()}`);
    console.log(`   └─ Simulation Speed: ${manager.getSimulationSpeed()}x`);
    console.log(`   └─ Sync Failures: ${finalStatus.failedAttempts}`);

    manager.stopSimulation();
    console.log('\n🛑 Simulation stopped. Demo complete!');
    process.exit(0);
  }, DEMO_CONFIG.demoDuration);
}

// Error handling
main().catch((error) => {
  console.error('❌ Demo failed:', error);
  process.exit(1);
});