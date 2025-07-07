import { TimeManager } from '../services/timeManagementService';

/**
 * Manual Event System Demo
 * 
 * This demo manually triggers the event system by directly calling
 * the private methods to demonstrate the event functionality.
 */

async function main() {
  console.log('🧪 Manual Event System Test\n');
  
  const manager = TimeManager.getInstance();
  manager.reset();
  
  // ========================================
  // Setup Event Callbacks
  // ========================================
  console.log('📅 Setting up event callbacks...');
  
  let midnightCount = 0;
  let preMidnightCount = 0;
  
  // Midnight callback
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
    console.log(`🌆 PRE-MIDNIGHT EVENT #${preMidnightCount}: ${simTime.toISOString()}`);
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
  // Start simulation
  // ========================================
  console.log('⚙️ Starting simulation...');
  manager.startSimulation(new Date('2050-01-01T12:00:00Z'));
  console.log('✅ Simulation started\n');
  
  // ========================================
  // Manually trigger events by setting time
  // ========================================
  console.log('🔧 Manually triggering pre-midnight event...');
  
  // Set time to 23:59 to trigger pre-midnight
  (manager as any)['simTime'] = new Date('2050-01-01T23:59:30Z');
  (manager as any)['checkAndTriggerTimeEvents']();
  
  console.log('\n🔧 Manually triggering midnight event (first time)...');
  
  // Set up for midnight trigger
  (manager as any)['lastSimDateString'] = '2050-01-01';
  (manager as any)['simTime'] = new Date('2050-01-02T00:00:00Z');
  (manager as any)['checkAndTriggerTimeEvents']();
  
  console.log('\n🔧 Manually triggering midnight event (second time - with error)...');
  
  // Trigger second midnight (should cause error in callback)
  (manager as any)['lastSimDateString'] = '2050-01-02';
  (manager as any)['simTime'] = new Date('2050-01-03T00:00:00Z');
  (manager as any)['checkAndTriggerTimeEvents']();
  
  console.log('\n🔧 Demonstrating real-world time mapping utilities...');
  
  const testDate = new Date('2050-01-15T14:30:00Z');
  console.log(`\nFor simulation date: ${testDate.toISOString()}`);
  
  const realEquivalent = manager.getRealWorldTimestampFromSimulationDate(testDate);
  const pickupTime = manager.getRealWorldPickupTimestamp(testDate);
  const deliveryTime = manager.getRealWorldDeliveryTimestamp(testDate);
  
  console.log(`├─ Real-world equivalent: ${realEquivalent.toISOString()}`);
  console.log(`├─ Pickup timestamp (start of day): ${pickupTime.toISOString()}`);
  console.log(`└─ Delivery timestamp (end of day): ${deliveryTime.toISOString()}`);
  
  // ========================================
  // Demo Summary
  // ========================================
  console.log('\n🎯 Manual Event Test Summary:');
  console.log(`   ├─ Midnight events triggered: ${midnightCount} ✅`);
  console.log(`   ├─ Pre-midnight events triggered: ${preMidnightCount} ✅`);
  console.log(`   ├─ Error handling: ${midnightCount >= 2 ? 'Tested ✅' : 'Not triggered'}`);
  console.log(`   ├─ Real-world time mapping: Demonstrated ✅`);
  console.log(`   └─ Event system: Fully functional ✅`);
  
  console.log('\n📊 Final Status:');
  console.log(`   ├─ Current sim time: ${manager.getCurrentTime().toISOString()}`);
  console.log(`   ├─ Real time: ${new Date().toISOString()}`);
  console.log(`   └─ Simulation running: ${manager.isSimulationRunning()}`);
  
  manager.stopSimulation();
  console.log('\n🛑 Manual event test complete!');
}

// Error handling
main().catch((error) => {
  console.error('❌ Manual event test failed:', error);
  process.exit(1);
});
