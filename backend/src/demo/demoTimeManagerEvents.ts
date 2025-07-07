import { TimeManager } from '../services/timeManagementService';

/**
 * TimeManager Event System Demo
 * 
 * This focused demo specifically demonstrates the event system features:
 * - Midnight event callbacks
 * - Pre-midnight event callbacks  
 * - Error handling in callbacks
 * - Real-world time mapping in events
 * 
 * To run: npx ts-node src/demo/demoTimeManagerEvents.ts
 */

async function main() {
  console.log('🌙 TimeManager Event System Demo\n');
  
  const manager = TimeManager.getInstance();
  
  // Reset to ensure clean state
  manager.reset();
  
  // ========================================
  // Setup Event Callbacks
  // ========================================
  console.log('📅 Setting up event callbacks...');
  
  let midnightCount = 0;
  let preMidnightCount = 0;
  
  // Midnight callback with real-world time mapping demo
  manager.onMidnight((simTime) => {
    midnightCount++;
    console.log(`\n🌙 MIDNIGHT EVENT #${midnightCount}:`);
    console.log(`   ├─ Simulation Time: ${simTime.toISOString()}`);
    console.log(`   ├─ Real World Time: ${new Date().toISOString()}`);
    
    // Demonstrate real-world time mapping utilities
    const realPickupTime = manager.getRealWorldPickupTimestamp(simTime);
    const realDeliveryTime = manager.getRealWorldDeliveryTimestamp(simTime);
    const realEquivalent = manager.getRealWorldTimestampFromSimulationDate(simTime);
    
    console.log(`   ├─ Real-world equivalent: ${realEquivalent.toISOString()}`);
    console.log(`   ├─ Pickup time (start of day): ${realPickupTime.toISOString()}`);
    console.log(`   └─ Delivery time (end of day): ${realDeliveryTime.toISOString()}`);
  });
  
  // Pre-midnight callback
  manager.onBeforeMidnight((simTime) => {
    preMidnightCount++;
    if (preMidnightCount <= 3) { // Only show first few to avoid spam
      console.log(`🌆 PRE-MIDNIGHT: ${simTime.toISOString()} (23:59)`);
    }
  });
  
  // Error handling demo callback
  manager.onMidnight((simTime) => {
    if (midnightCount === 2) {
      console.log(`💥 Triggering error in callback (should be handled gracefully)...`);
      throw new Error('Demo error - this should not crash the system');
    }
  });
  
  console.log('✅ Event callbacks registered\n');
  
  // ========================================
  // Start simulation close to midnight
  // ========================================
  console.log('⏰ Starting simulation at 23:59:45 (15 seconds before midnight)...');
  
  const startTime = new Date('2050-01-01T23:59:45Z');
  manager.startSimulation(startTime, undefined, 100); // 100ms intervals for responsive events
  
  console.log(`   └─ Start time: ${startTime.toISOString()}`);
  console.log(`   └─ Update interval: 100ms (fast for demo)`);
  console.log(`   └─ Waiting for midnight events...\n`);
  
  // ========================================
  // Monitor for events
  // ========================================
  const monitorInterval = setInterval(() => {
    const currentTime = manager.getCurrentTime();
    const hours = currentTime.getUTCHours();
    const minutes = currentTime.getUTCMinutes();
    const seconds = currentTime.getUTCSeconds();
    
    // Show countdown to midnight for first day
    if (midnightCount === 0 && hours === 23 && minutes === 59) {
      const secondsToMidnight = 60 - seconds;
      console.log(`⏳ ${secondsToMidnight} seconds to midnight... (${currentTime.toISOString()})`);
    }
  }, 1000);
  
  // ========================================
  // Demo completion after multiple midnights
  // ========================================
  setTimeout(() => {
    clearInterval(monitorInterval);
    
    console.log('\n🎯 Event Demo Summary:');
    console.log(`   ├─ Midnight events triggered: ${midnightCount}`);
    console.log(`   ├─ Pre-midnight events triggered: ${preMidnightCount}`);
    console.log(`   ├─ Error handling: ${midnightCount >= 2 ? 'Tested ✅' : 'Not triggered'}`);
    console.log(`   └─ Real-world time mapping: Demonstrated in callbacks ✅`);
    
    console.log('\n📊 Final Status:');
    console.log(`   ├─ Current sim time: ${manager.getCurrentTime().toISOString()}`);
    console.log(`   ├─ Real time: ${new Date().toISOString()}`);
    console.log(`   └─ Simulation running: ${manager.isSimulationRunning()}`);
    
    manager.stopSimulation();
    console.log('\n🛑 Event demo complete!');
    process.exit(0);
  }, 30000); // 30 second demo
}

// Error handling
main().catch((error) => {
  console.error('❌ Event demo failed:', error);
  process.exit(1);
});
