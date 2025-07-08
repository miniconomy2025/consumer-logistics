import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1751962723585 implements MigrationInterface {
    name = 'InitialSchema1751962723585'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "truck_type" ("truck_type_id" SERIAL NOT NULL, "truck_type_name" character varying(50) NOT NULL, CONSTRAINT "UQ_dcf57b08a142ad5f1a00235c75d" UNIQUE ("truck_type_name"), CONSTRAINT "PK_93b246e71b8d868aa3c671ee265" PRIMARY KEY ("truck_type_id"))`);
        await queryRunner.query(`CREATE TABLE "service_type" ("service_type_id" SERIAL NOT NULL, "service_type_name" character varying(50) NOT NULL, CONSTRAINT "UQ_adf50fddb042589b07b5d6d07d4" UNIQUE ("service_type_name"), CONSTRAINT "PK_dd0e0b533f7c7420e77216af8d1" PRIMARY KEY ("service_type_id"))`);
        await queryRunner.query(`CREATE TABLE "transaction_type" ("transaction_type_id" SERIAL NOT NULL, "type_name" character varying(50) NOT NULL, CONSTRAINT "PK_fa15cdd9f6ea232ff4f50c0970c" PRIMARY KEY ("transaction_type_id"))`);
        await queryRunner.query(`CREATE TABLE "transaction_ledger" ("transaction_ledger_id" SERIAL NOT NULL, "invoice_id" integer NOT NULL, "transaction_type_id" integer NOT NULL, "amount" numeric(10,2) NOT NULL, "transaction_date" date NOT NULL, "invoiceInvoiceId" integer, "transactionTypeTransactionTypeId" integer, CONSTRAINT "PK_874f3666e56741c8c9b86d40af4" PRIMARY KEY ("transaction_ledger_id"))`);
        await queryRunner.query(`CREATE TABLE "invoice" ("invoice_id" SERIAL NOT NULL, "reference_number" uuid NOT NULL DEFAULT uuid_generate_v4(), "total_amount" numeric(10,2) NOT NULL, "paid" boolean NOT NULL, CONSTRAINT "UQ_ae9b85c6227bb452be78ac78fc4" UNIQUE ("reference_number"), CONSTRAINT "PK_a7e64c304165d9e5dfa274f18d9" PRIMARY KEY ("invoice_id"))`);
        await queryRunner.query(`CREATE TABLE "pickup_status" ("pickup_status_id" SERIAL NOT NULL, "status_name" character varying(50) NOT NULL, CONSTRAINT "UQ_644864364b48abab1457f4cdcd3" UNIQUE ("status_name"), CONSTRAINT "PK_30df0fc3686f003a6b4aefeddf5" PRIMARY KEY ("pickup_status_id"))`);
        await queryRunner.query(`CREATE TABLE "company" ("company_id" SERIAL NOT NULL, "company_name" character varying(255) NOT NULL, "bank_account_id" character varying(255), CONSTRAINT "UQ_831e30688ec18c3fe41894e6b0a" UNIQUE ("company_name"), CONSTRAINT "PK_b7f9888ba8bd654c4860ddfcb3a" PRIMARY KEY ("company_id"))`);
        await queryRunner.query(`CREATE TABLE "pickup" ("pickup_id" SERIAL NOT NULL, "invoice_id" integer NOT NULL, "pickup_status_id" integer NOT NULL, "company_id" integer NOT NULL, "phone_units" integer NOT NULL, "order_date" date NOT NULL, "order_timestamp_simulated" TIMESTAMP NOT NULL, "unit_price" numeric(10,2) NOT NULL, "recipient_name" character varying(255) NOT NULL, CONSTRAINT "PK_8ec4ec7d42e29ddf2b184fc41fe" PRIMARY KEY ("pickup_id"))`);
        await queryRunner.query(`CREATE TABLE "logistics_details" ("logistics_details_id" SERIAL NOT NULL, "pickup_id" integer NOT NULL, "service_type_id" integer NOT NULL, "scheduled_time" TIMESTAMP NOT NULL, "quantity" integer NOT NULL, "logistics_status" character varying(50) NOT NULL DEFAULT 'PENDING_PLANNING', "scheduled_real_pickup_timestamp" TIMESTAMP, "scheduled_real_delivery_timestamp" TIMESTAMP, "scheduled_simulated_pickup_timestamp" TIMESTAMP, "scheduled_simulated_delivery_timestamp" TIMESTAMP, CONSTRAINT "REL_6175ebf66d95eacc6c2f98eb68" UNIQUE ("pickup_id"), CONSTRAINT "PK_f29bf3112ce89b41c7a228f8a8e" PRIMARY KEY ("logistics_details_id"))`);
        await queryRunner.query(`CREATE TABLE "truck_allocation" ("logistics_details_id" integer NOT NULL, "truck_id" integer NOT NULL, CONSTRAINT "PK_015b364af139e634e12b7972e4b" PRIMARY KEY ("logistics_details_id", "truck_id"))`);
        await queryRunner.query(`CREATE TABLE "truck" ("truck_id" SERIAL NOT NULL, "truck_type_id" integer NOT NULL, "max_pickups" integer NOT NULL, "max_dropoffs" integer NOT NULL, "daily_operating_cost" numeric(10,2) NOT NULL, "max_capacity" numeric(10,2) NOT NULL, "is_available" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_21860c9f57b19eb3cab391f6a38" PRIMARY KEY ("truck_id"))`);
        await queryRunner.query(`ALTER TABLE "transaction_ledger" ADD CONSTRAINT "FK_e6f287932ccbc32bc8ad78d21b1" FOREIGN KEY ("invoiceInvoiceId") REFERENCES "invoice"("invoice_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_ledger" ADD CONSTRAINT "FK_4999d2dbfdb02015edca50ff5f9" FOREIGN KEY ("transactionTypeTransactionTypeId") REFERENCES "transaction_type"("transaction_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pickup" ADD CONSTRAINT "FK_b1d25a1c18b1f80c0343fa3bc39" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("invoice_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pickup" ADD CONSTRAINT "FK_26a8ef77e9c68c89dcfa0180956" FOREIGN KEY ("pickup_status_id") REFERENCES "pickup_status"("pickup_status_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pickup" ADD CONSTRAINT "FK_abbc6385c3a1168d68e4afdff36" FOREIGN KEY ("company_id") REFERENCES "company"("company_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "logistics_details" ADD CONSTRAINT "FK_0e11c517bb362d1030157985e23" FOREIGN KEY ("service_type_id") REFERENCES "service_type"("service_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "logistics_details" ADD CONSTRAINT "FK_6175ebf66d95eacc6c2f98eb68a" FOREIGN KEY ("pickup_id") REFERENCES "pickup"("pickup_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "truck_allocation" ADD CONSTRAINT "FK_ad9928c792556d50c6061073812" FOREIGN KEY ("logistics_details_id") REFERENCES "logistics_details"("logistics_details_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "truck_allocation" ADD CONSTRAINT "FK_f058855242ff926dd7a3c888a45" FOREIGN KEY ("truck_id") REFERENCES "truck"("truck_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "truck" ADD CONSTRAINT "FK_66a6938220a862042238520f419" FOREIGN KEY ("truck_type_id") REFERENCES "truck_type"("truck_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "truck" DROP CONSTRAINT "FK_66a6938220a862042238520f419"`);
        await queryRunner.query(`ALTER TABLE "truck_allocation" DROP CONSTRAINT "FK_f058855242ff926dd7a3c888a45"`);
        await queryRunner.query(`ALTER TABLE "truck_allocation" DROP CONSTRAINT "FK_ad9928c792556d50c6061073812"`);
        await queryRunner.query(`ALTER TABLE "logistics_details" DROP CONSTRAINT "FK_6175ebf66d95eacc6c2f98eb68a"`);
        await queryRunner.query(`ALTER TABLE "logistics_details" DROP CONSTRAINT "FK_0e11c517bb362d1030157985e23"`);
        await queryRunner.query(`ALTER TABLE "pickup" DROP CONSTRAINT "FK_abbc6385c3a1168d68e4afdff36"`);
        await queryRunner.query(`ALTER TABLE "pickup" DROP CONSTRAINT "FK_26a8ef77e9c68c89dcfa0180956"`);
        await queryRunner.query(`ALTER TABLE "pickup" DROP CONSTRAINT "FK_b1d25a1c18b1f80c0343fa3bc39"`);
        await queryRunner.query(`ALTER TABLE "transaction_ledger" DROP CONSTRAINT "FK_4999d2dbfdb02015edca50ff5f9"`);
        await queryRunner.query(`ALTER TABLE "transaction_ledger" DROP CONSTRAINT "FK_e6f287932ccbc32bc8ad78d21b1"`);
        await queryRunner.query(`DROP TABLE "truck"`);
        await queryRunner.query(`DROP TABLE "truck_allocation"`);
        await queryRunner.query(`DROP TABLE "logistics_details"`);
        await queryRunner.query(`DROP TABLE "pickup"`);
        await queryRunner.query(`DROP TABLE "company"`);
        await queryRunner.query(`DROP TABLE "pickup_status"`);
        await queryRunner.query(`DROP TABLE "invoice"`);
        await queryRunner.query(`DROP TABLE "transaction_ledger"`);
        await queryRunner.query(`DROP TABLE "transaction_type"`);
        await queryRunner.query(`DROP TABLE "service_type"`);
        await queryRunner.query(`DROP TABLE "truck_type"`);
    }

}
