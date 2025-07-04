#!/usr/bin/env ts-node

/**
 * Database Seeding Script
 * 
 * This script populates the database with realistic test data including:
 * - Companies
 * - Truck types and trucks
 * - Service types (collection, delivery)
 * - Transaction types (loan repayment)
 * - Invoices
 * - Pickups with various statuses
 * - Transactions
 */

import 'reflect-metadata';
import { AppDataSource } from '../src/database/config';
import { CompanyEntity } from '../src/database/models/CompanyEntity';
import { TruckTypeEntity } from '../src/database/models/TruckTypeEntity';
import { TruckEntity } from '../src/database/models/TruckEntity';
import { ServiceTypeEntity } from '../src/database/models/ServiceTypeEntity';
import { TransactionTypeEntity } from '../src/database/models/TransactionType';
import { PickupStatusEntity } from '../src/database/models/PickupStatusEntity';
import { InvoiceEntity } from '../src/database/models/InvoiceEntity';
import { PickupEntity } from '../src/database/models/PickupEntity';
import { TransactionEntity } from '../src/database/models/TransactionEntity';
import { logger } from '../src/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Sample data arrays
const COMPANY_NAMES = [
  'Acme Corporation',
  'Global Logistics Ltd',
  'Metro Supplies Inc',
  'Urban Distribution Co',
  'Prime Delivery Services',
  'Express Transport Solutions',
  'City Wide Logistics',
  'Fast Track Shipping',
  'Reliable Cargo Systems',
  'Swift Logistics Group',
  'Elite Transport Co',
  'Rapid Delivery Network',
  'Professional Freight Services',
  'Advanced Logistics Solutions',
  'Premier Shipping Company'
];

const TRUCK_TYPES = [
  { name: 'Small Van', maxPickups: 15, maxDropoffs: 10, cost: 250.00, capacity: 1000.00 },
  { name: 'Medium Truck', maxPickups: 25, maxDropoffs: 15, cost: 450.00, capacity: 2500.00 },
  { name: 'Large Truck', maxPickups: 40, maxDropoffs: 25, cost: 750.00, capacity: 5000.00 },
  { name: 'Extra Large Truck', maxPickups: 60, maxDropoffs: 35, cost: 1200.00, capacity: 8000.00 }
];

const CUSTOMER_NAMES = [
  'John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'David Wilson',
  'Lisa Anderson', 'Robert Taylor', 'Jennifer Martinez', 'William Garcia', 'Jessica Rodriguez',
  'Christopher Lee', 'Amanda White', 'Matthew Harris', 'Ashley Clark', 'Daniel Lewis',
  'Stephanie Walker', 'Anthony Hall', 'Melissa Young', 'Mark Allen', 'Nicole King'
];

const SERVICE_TYPES = ['collection', 'delivery'];
const TRANSACTION_TYPES = ['loan repayment'];

class DatabaseSeeder {
  private companies: CompanyEntity[] = [];
  private truckTypes: TruckTypeEntity[] = [];
  private trucks: TruckEntity[] = [];
  private serviceTypes: ServiceTypeEntity[] = [];
  private transactionTypes: TransactionTypeEntity[] = [];
  private pickupStatuses: PickupStatusEntity[] = [];
  private invoices: InvoiceEntity[] = [];
  private pickups: PickupEntity[] = [];

  async seed() {
    try {
      logger.info('🌱 Starting database seeding...');

      // Initialize database connection
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
        logger.info('✅ Database connection initialized');
      }

      // Clear existing data (optional - comment out if you want to preserve existing data)
      await this.clearExistingData();

      // Seed reference data first
      await this.seedServiceTypes();
      await this.seedTransactionTypes();
      await this.seedTruckTypes();
      await this.seedTrucks();
      await this.seedCompanies();

      // Get pickup statuses (these should already exist from migration)
      await this.loadPickupStatuses();

      // Seed transactional data
      await this.seedInvoicesAndPickups();
      await this.seedTransactions();

      logger.info('🎉 Database seeding completed successfully!');
      logger.info(`📊 Seeded data summary:`);
      logger.info(`   - Companies: ${this.companies.length}`);
      logger.info(`   - Truck Types: ${this.truckTypes.length}`);
      logger.info(`   - Trucks: ${this.trucks.length}`);
      logger.info(`   - Service Types: ${this.serviceTypes.length}`);
      logger.info(`   - Transaction Types: ${this.transactionTypes.length}`);
      logger.info(`   - Invoices: ${this.invoices.length}`);
      logger.info(`   - Pickups: ${this.pickups.length}`);

    } catch (error) {
      logger.error('❌ Database seeding failed:', error);
      throw error;
    } finally {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        logger.info('🔌 Database connection closed');
      }
    }
  }

  private async clearExistingData() {
    logger.info('🧹 Clearing existing data...');
    
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    
    try {
      // Disable foreign key checks temporarily
      await queryRunner.query('SET session_replication_role = replica;');
      
      // Clear tables in reverse dependency order
      await queryRunner.query('TRUNCATE TABLE transaction RESTART IDENTITY CASCADE;');
      await queryRunner.query('TRUNCATE TABLE pickup RESTART IDENTITY CASCADE;');
      await queryRunner.query('TRUNCATE TABLE invoice RESTART IDENTITY CASCADE;');
      await queryRunner.query('TRUNCATE TABLE truck RESTART IDENTITY CASCADE;');
      await queryRunner.query('TRUNCATE TABLE truck_type RESTART IDENTITY CASCADE;');
      await queryRunner.query('TRUNCATE TABLE company RESTART IDENTITY CASCADE;');
      await queryRunner.query('TRUNCATE TABLE service_type RESTART IDENTITY CASCADE;');
      await queryRunner.query('TRUNCATE TABLE transaction_type RESTART IDENTITY CASCADE;');
      
      // Re-enable foreign key checks
      await queryRunner.query('SET session_replication_role = DEFAULT;');
      
      logger.info('✅ Existing data cleared');
    } finally {
      await queryRunner.release();
    }
  }

  private async seedServiceTypes() {
    logger.info('📦 Seeding service types...');
    const serviceTypeRepo = AppDataSource.getRepository(ServiceTypeEntity);

    for (const serviceTypeName of SERVICE_TYPES) {
      const serviceType = serviceTypeRepo.create({
        service_type_name: serviceTypeName
      });
      const saved = await serviceTypeRepo.save(serviceType);
      this.serviceTypes.push(saved);
      logger.info(`   ✓ Created service type: ${serviceTypeName}`);
    }
  }

  private async seedTransactionTypes() {
    logger.info('💰 Seeding transaction types...');
    const transactionTypeRepo = AppDataSource.getRepository(TransactionTypeEntity);

    for (const transactionTypeName of TRANSACTION_TYPES) {
      const transactionType = transactionTypeRepo.create({
        transaction_type_name: transactionTypeName
      });
      const saved = await transactionTypeRepo.save(transactionType);
      this.transactionTypes.push(saved);
      logger.info(`   ✓ Created transaction type: ${transactionTypeName}`);
    }
  }

  private async seedTruckTypes() {
    logger.info('🚛 Seeding truck types...');
    const truckTypeRepo = AppDataSource.getRepository(TruckTypeEntity);

    for (const truckTypeData of TRUCK_TYPES) {
      const truckType = truckTypeRepo.create({
        truck_type_name: truckTypeData.name
      });
      const saved = await truckTypeRepo.save(truckType);
      this.truckTypes.push(saved);
      logger.info(`   ✓ Created truck type: ${truckTypeData.name}`);
    }
  }

  private async seedTrucks() {
    logger.info('🚚 Seeding trucks...');
    const truckRepo = AppDataSource.getRepository(TruckEntity);

    for (let i = 0; i < this.truckTypes.length; i++) {
      const truckType = this.truckTypes[i];
      const truckData = TRUCK_TYPES[i];
      
      // Create 2-3 trucks per type
      const trucksPerType = Math.floor(Math.random() * 2) + 2; // 2-3 trucks
      
      for (let j = 0; j < trucksPerType; j++) {
        const truck = truckRepo.create({
          truck_type_id: truckType.truck_type_id,
          max_pickups: truckData.maxPickups,
          max_dropoffs: truckData.maxDropoffs,
          daily_operating_cost: truckData.cost,
          max_capacity: truckData.capacity
        });
        const saved = await truckRepo.save(truck);
        this.trucks.push(saved);
        logger.info(`   ✓ Created truck: ${truckType.truck_type_name} #${j + 1}`);
      }
    }
  }

  private async seedCompanies() {
    logger.info('🏢 Seeding companies...');
    const companyRepo = AppDataSource.getRepository(CompanyEntity);

    for (const companyName of COMPANY_NAMES) {
      const company = companyRepo.create({
        company_name: companyName
      });
      const saved = await companyRepo.save(company);
      this.companies.push(saved);
      logger.info(`   ✓ Created company: ${companyName}`);
    }
  }

  private async loadPickupStatuses() {
    logger.info('📋 Loading pickup statuses...');
    const pickupStatusRepo = AppDataSource.getRepository(PickupStatusEntity);
    this.pickupStatuses = await pickupStatusRepo.find();
    logger.info(`   ✓ Loaded ${this.pickupStatuses.length} pickup statuses`);
  }

  private async seedInvoicesAndPickups() {
    logger.info('📄 Seeding invoices and pickups...');
    const invoiceRepo = AppDataSource.getRepository(InvoiceEntity);
    const pickupRepo = AppDataSource.getRepository(PickupEntity);

    const numberOfInvoices = 150; // Create 150 invoices with pickups
    
    for (let i = 0; i < numberOfInvoices; i++) {
      // Create invoice
      const unitPrice = Math.floor(Math.random() * 500) + 50; // R50 - R550
      const invoice = invoiceRepo.create({
        reference_number: uuidv4(),
        total_amount: unitPrice,
        paid: Math.random() > 0.3 // 70% paid, 30% unpaid
      });
      const savedInvoice = await invoiceRepo.save(invoice);
      this.invoices.push(savedInvoice);

      // Create pickup for this invoice
      const randomCompany = this.companies[Math.floor(Math.random() * this.companies.length)];
      const randomStatus = this.pickupStatuses[Math.floor(Math.random() * this.pickupStatuses.length)];
      const randomCustomer = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
      
      // Generate pickup date (last 90 days)
      const pickupDate = new Date();
      pickupDate.setDate(pickupDate.getDate() - Math.floor(Math.random() * 90));

      const pickup = pickupRepo.create({
        invoice_id: savedInvoice.invoice_id,
        company_id: randomCompany.company_id,
        pickup_status_id: randomStatus.pickup_status_id,
        pickup_date: pickupDate,
        unit_price: unitPrice,
        customer: randomCustomer
      });
      const savedPickup = await pickupRepo.save(pickup);
      this.pickups.push(savedPickup);

      if ((i + 1) % 25 === 0) {
        logger.info(`   ✓ Created ${i + 1} invoices and pickups`);
      }
    }
  }

  private async seedTransactions() {
    logger.info('💳 Seeding transactions...');
    const transactionRepo = AppDataSource.getRepository(TransactionEntity);

    // Create transactions for paid invoices
    const paidInvoices = this.invoices.filter(invoice => invoice.paid);
    const loanRepaymentType = this.transactionTypes.find(t => t.transaction_type_name === 'loan repayment');
    const collectionService = this.serviceTypes.find(s => s.service_type_name === 'collection');
    const deliveryService = this.serviceTypes.find(s => s.service_type_name === 'delivery');

    if (!loanRepaymentType || !collectionService || !deliveryService) {
      throw new Error('Required transaction type or service types not found');
    }

    for (const invoice of paidInvoices) {
      // Randomly choose between collection and delivery
      const serviceType = Math.random() > 0.5 ? collectionService : deliveryService;
      
      // Generate transaction date (same as or after pickup date)
      const relatedPickup = this.pickups.find(p => p.invoice_id === invoice.invoice_id);
      const transactionDate = relatedPickup?.pickup_date || new Date();
      
      // Add 1-5 days to pickup date for transaction
      const finalTransactionDate = new Date(transactionDate);
      finalTransactionDate.setDate(finalTransactionDate.getDate() + Math.floor(Math.random() * 5) + 1);

      const transaction = transactionRepo.create({
        invoice_id: invoice.invoice_id,
        service_type_id: serviceType.service_type_id,
        transaction_type_id: loanRepaymentType.transaction_type_id,
        amount: invoice.total_amount,
        transaction_date: finalTransactionDate
      });
      await transactionRepo.save(transaction);
    }

    logger.info(`   ✓ Created ${paidInvoices.length} transactions`);
  }
}

// Main execution
async function main() {
  const seeder = new DatabaseSeeder();
  await seeder.seed();
}

// Run the seeder
if (require.main === module) {
  main().catch((error) => {
    logger.error('Seeding failed:', error);
    process.exit(1);
  });
}

export default DatabaseSeeder;
