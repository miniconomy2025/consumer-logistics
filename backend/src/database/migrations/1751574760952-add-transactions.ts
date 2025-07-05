import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTransactions1751574760952 implements MigrationInterface {
    name = 'AddTransactions1751574760952'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create service_type table
        await queryRunner.query(`CREATE TABLE "service_type" ("service_type_id" SERIAL NOT NULL, "service_type_name" character varying(50) NOT NULL, CONSTRAINT "PK_service_type_id" PRIMARY KEY ("service_type_id"))`);
        
        // Create transaction_type table
        await queryRunner.query(`CREATE TABLE "transaction_type" ("transaction_type_id" SERIAL NOT NULL, "transaction_type_name" character varying(50) NOT NULL, CONSTRAINT "PK_transaction_type_id" PRIMARY KEY ("transaction_type_id"))`);
        
        // Create transaction table
        await queryRunner.query(`CREATE TABLE "transaction" ("transaction_id" SERIAL NOT NULL, "invoice_id" integer NOT NULL, "service_type_id" integer NOT NULL, "amount" numeric(10,2) NOT NULL, "transaction_date" date NOT NULL, "transaction_type_id" integer NOT NULL, CONSTRAINT "PK_transaction_id" PRIMARY KEY ("transaction_id"))`);
        
        // Add foreign key constraints
        await queryRunner.query(`ALTER TABLE "transaction" ADD CONSTRAINT "FK_transaction_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("invoice_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD CONSTRAINT "FK_transaction_service_type" FOREIGN KEY ("service_type_id") REFERENCES "service_type"("service_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD CONSTRAINT "FK_transaction_transaction_type" FOREIGN KEY ("transaction_type_id") REFERENCES "transaction_type"("transaction_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_transaction_transaction_type"`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_transaction_service_type"`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_transaction_invoice"`);
        
        // Drop tables
        await queryRunner.query(`DROP TABLE "transaction"`);
        await queryRunner.query(`DROP TABLE "transaction_type"`);
        await queryRunner.query(`DROP TABLE "service_type"`);
    }
}
