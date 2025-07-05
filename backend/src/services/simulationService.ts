import { logger } from '../utils/logger';

export class SimulationService {
  private readonly REAL_MINUTES_PER_SIM_DAY: number = 2; 
  private readonly SIM_START_DATE: Date = new Date('2050-01-01T00:00:00.000Z'); 
  private readonly REAL_WORLD_APP_START_TIME: Date;

  constructor() {
    this.REAL_WORLD_APP_START_TIME = new Date();
    logger.info(`Simulation Service initialized.`);
    logger.info(`Simulated time starts at: ${this.SIM_START_DATE.toISOString()}`);
    logger.info(`Real-world app start time: ${this.REAL_WORLD_APP_START_TIME.toISOString()}`);
    logger.info(`Scale: ${this.REAL_MINUTES_PER_SIM_DAY} real minutes = 1 in-simulation day.`);
  }


  public getInSimulationDate(realWorldTime: Date = new Date()): Date {
    const realWorldMillisSinceAppStart = realWorldTime.getTime() - this.REAL_WORLD_APP_START_TIME.getTime();
    const simDaysSinceAppStart = realWorldMillisSinceAppStart / (this.REAL_MINUTES_PER_SIM_DAY * 60 * 1000);

    const simMillisSinceSimStart = simDaysSinceAppStart * (24 * 60 * 60 * 1000);
    return new Date(this.SIM_START_DATE.getTime() + simMillisSinceSimStart);
  }

  public getRealWorldTimestampFromSimulationDate(simDate: Date): Date {
    const simMillisSinceSimStart = simDate.getTime() - this.SIM_START_DATE.getTime();
    const realWorldMillisSinceAppStart = simMillisSinceSimStart * this.REAL_MINUTES_PER_SIM_DAY * 60 * 1000 / (24 * 60 * 60 * 1000);

    return new Date(this.REAL_WORLD_APP_START_TIME.getTime() + realWorldMillisSinceAppStart);
  }

  public getRealWorldPickupTimestamp(simDate: Date): Date {
    const simDateAtMidnight = new Date(Date.UTC(simDate.getUTCFullYear(), simDate.getUTCMonth(), simDate.getUTCDate(), 0, 0, 0, 0));
    return this.getRealWorldTimestampFromSimulationDate(simDateAtMidnight);
  }

  public getRealWorldDeliveryTimestamp(simDate: Date): Date {
    const simDateAtEndOfDay = new Date(Date.UTC(simDate.getUTCFullYear(), simDate.getUTCMonth(), simDate.getUTCDate(), 23, 59, 59, 999));
    return this.getRealWorldTimestampFromSimulationDate(simDateAtEndOfDay);
  }
}