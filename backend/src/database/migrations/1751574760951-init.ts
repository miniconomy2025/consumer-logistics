import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1751574760951 implements MigrationInterface {
    name = 'Init1751574760951'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
        await queryRunner.query(`CREATE TABLE "truck_type" ("truck_type_id" SERIAL NOT NULL, "truck_type_name" character varying(50) NOT NULL, CONSTRAINT "UQ_dcf57b08a142ad5f1a00235c75d" UNIQUE ("truck_type_name"), CONSTRAINT "PK_93b246e71b8d868aa3c671ee265" PRIMARY KEY ("truck_type_id"))`);
        await queryRunner.query(`CREATE TABLE "truck" ("truck_id" SERIAL NOT NULL, "truck_type_id" integer NOT NULL, "max_pickups" integer NOT NULL, "max_dropoffs" integer NOT NULL, "daily_operating_cost" numeric(10,2) NOT NULL, "max_capacity" numeric(10,2) NOT NULL, CONSTRAINT "PK_21860c9f57b19eb3cab391f6a38" PRIMARY KEY ("truck_id"))`);
        await queryRunner.query(`CREATE TABLE "invoice" ("invoice_id" SERIAL NOT NULL, "reference_number" uuid NOT NULL DEFAULT uuid_generate_v4(), "total_amount" numeric(10,2) NOT NULL, "paid" boolean NOT NULL, CONSTRAINT "UQ_ae9b85c6227bb452be78ac78fc4" UNIQUE ("reference_number"), CONSTRAINT "PK_a7e64c304165d9e5dfa274f18d9" PRIMARY KEY ("invoice_id"))`);
        await queryRunner.query(`CREATE TABLE "pickup_status" ("pickup_status_id" SERIAL NOT NULL, "status_name" character varying(50) NOT NULL, CONSTRAINT "PK_30df0fc3686f003a6b4aefeddf5" PRIMARY KEY ("pickup_status_id"))`);
        
        // Insert initial statuses
        await queryRunner.query(`
          INSERT INTO "pickup_status" (status_name) VALUES
            ('Order Received'),
            ('Ready for Collection'),
            ('Collected'),
            ('Delivered');
        `);

        await queryRunner.query(`CREATE TABLE "company" ("company_id" SERIAL NOT NULL, "company_name" character varying(255) NOT NULL, CONSTRAINT "PK_b7f9888ba8bd654c4860ddfcb3a" PRIMARY KEY ("company_id"))`);
        await queryRunner.query(`CREATE TABLE "pickup" ("pickup_id" SERIAL NOT NULL, "invoice_id" integer NOT NULL, "pickup_status_id" integer NOT NULL, "company_id" integer NOT NULL, "pickup_date" date, "unit_price" numeric(10,2) NOT NULL, "customer" character varying(255) NOT NULL, CONSTRAINT "PK_8ec4ec7d42e29ddf2b184fc41fe" PRIMARY KEY ("pickup_id"))`);
        await queryRunner.query(`ALTER TABLE "truck" ADD CONSTRAINT "FK_66a6938220a862042238520f419" FOREIGN KEY ("truck_type_id") REFERENCES "truck_type"("truck_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pickup" ADD CONSTRAINT "FK_b1d25a1c18b1f80c0343fa3bc39" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("invoice_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pickup" ADD CONSTRAINT "FK_26a8ef77e9c68c89dcfa0180956" FOREIGN KEY ("pickup_status_id") REFERENCES "pickup_status"("pickup_status_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pickup" ADD CONSTRAINT "FK_abbc6385c3a1168d68e4afdff36" FOREIGN KEY ("company_id") REFERENCES "company"("company_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pickup" DROP CONSTRAINT "FK_abbc6385c3a1168d68e4afdff36"`);
        await queryRunner.query(`ALTER TABLE "pickup" DROP CONSTRAINT "FK_26a8ef77e9c68c89dcfa0180956"`);
        await queryRunner.query(`ALTER TABLE "pickup" DROP CONSTRAINT "FK_b1d25a1c18b1f80c0343fa3bc39"`);
        await queryRunner.query(`ALTER TABLE "truck" DROP CONSTRAINT "FK_66a6938220a862042238520f419"`);
        await queryRunner.query(`DROP TABLE "pickup"`);
        await queryRunner.query(`DROP TABLE "company"`);
        await queryRunner.query(`DROP TABLE "pickup_status"`);
        await queryRunner.query(`DROP TABLE "invoice"`);
        await queryRunner.query(`DROP TABLE "truck"`);
        await queryRunner.query(`DROP TABLE "truck_type"`);
    }

}
