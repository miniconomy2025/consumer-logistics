import { AppDataSource } from '../../database/config';
import { PickupEntity } from '../../database/models/PickupEntity';
import { PickupStatusEntity } from '../../database/models/PickupStatusEntity';

describe('PickupEntity Integration', () => {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    // Optionally clear tables before each test run
    await AppDataSource.getRepository(PickupEntity).clear();
    await AppDataSource.getRepository(PickupStatusEntity).clear();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  it('should create and retrieve a pickup entity with status', async () => {
    const statusRepo = AppDataSource.getRepository(PickupStatusEntity);
    const pickupRepo = AppDataSource.getRepository(PickupEntity);

    // Create and save a pickup status
    const status = statusRepo.create({ pickup_status_id: 1, pick_status_name: 'Ready' });
    await statusRepo.save(status);

    // Create and save a pickup entity
    const pickup = pickupRepo.create({
      pickup_id: 1,
      pickup_status_id: status.pickup_status_id,
      phone_company_id: 123,
      phone_units: 10,
      pickup_date: new Date(),
      unit_price: 100.0,
      pickupStatus: status,
    });
    await pickupRepo.save(pickup);

    // Retrieve and assert
    const found = await pickupRepo.findOne({
      where: { pickup_id: 1 },
      relations: ['pickupStatus'],
    });

    expect(found).toBeDefined();
    expect(found?.pickupStatus?.pick_status_name).toBe('Ready');
    expect(found?.phone_company_id).toBe(123);
  });
});
