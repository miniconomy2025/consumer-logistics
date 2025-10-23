jest.mock('../utils/logger');

import { SimulationService } from '../services/simulationService';

describe('SimulationService', () => {
  const fixedNow = new Date('2025-10-23T12:00:00.000Z');
  beforeEach(() => {
    jest.useFakeTimers({ now: fixedNow });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('getInSimulationDate returns SIM_START_DATE when real time equals app start', () => {
    const svc = new SimulationService();

    const simDate = svc.getInSimulationDate(fixedNow);

    // Access private SIM_START_DATE via any for assertion
    const expected = (svc as any).SIM_START_DATE as Date;
    expect(simDate.toISOString()).toBe(expected.toISOString());
  });

  it('advances 1 simulation day after REAL_MINUTES_PER_SIM_DAY real minutes', () => {
    const svc = new SimulationService();
    const scale = (svc as any).REAL_MINUTES_PER_SIM_DAY as number;
    const realAdvanceMs = scale * 60 * 1000; // minutes -> ms

    const later = new Date(fixedNow.getTime() + realAdvanceMs);
    const simDate = svc.getInSimulationDate(later);

    const simStart = (svc as any).SIM_START_DATE as Date;
    const expected = new Date(simStart.getTime() + 24 * 60 * 60 * 1000); // +1 day

    expect(simDate.toISOString()).toBe(expected.toISOString());
  });

  it('getRealWorldTimestampFromSimulationDate maps simulation days back to real minutes', () => {
    const svc = new SimulationService();
    const scale = (svc as any).REAL_MINUTES_PER_SIM_DAY as number;

    const simStart = (svc as any).SIM_START_DATE as Date;
    const threeDays = new Date(simStart.getTime() + 3 * 24 * 60 * 60 * 1000);

    const real = svc.getRealWorldTimestampFromSimulationDate(threeDays);

    const expectedReal = new Date(fixedNow.getTime() + 3 * scale * 60 * 1000);

    expect(real.toISOString()).toBe(expectedReal.toISOString());
  });

  it('getRealWorldPickupTimestamp maps simulation date midnight to correct real time', () => {
    const svc = new SimulationService();

    const simDate = new Date('2050-01-10T10:30:00.000Z');
    const pickupReal = svc.getRealWorldPickupTimestamp(simDate);

    // midnight UTC of simDate
    const simMidnight = new Date(Date.UTC(2050, 0, 10, 0, 0, 0, 0));
    const expected = svc.getRealWorldTimestampFromSimulationDate(simMidnight);

    expect(pickupReal.toISOString()).toBe(expected.toISOString());
  });

  it('getRealWorldDeliveryTimestamp maps simulation date end-of-day to correct real time', () => {
    const svc = new SimulationService();

    const simDate = new Date('2050-01-10T10:30:00.000Z');
    const deliveryReal = svc.getRealWorldDeliveryTimestamp(simDate);

    const simEnd = new Date(Date.UTC(2050, 0, 10, 23, 59, 59, 999));
    const expected = svc.getRealWorldTimestampFromSimulationDate(simEnd);

    expect(deliveryReal.toISOString()).toBe(expected.toISOString());
  });
});
