import { MigrationInterface, QueryRunner } from "typeorm";

export class PaymentRecord1753209921649 implements MigrationInterface {
    name = 'PaymentRecord1753209921649';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "payment_record" (
                "id" SERIAL NOT NULL,
                "transaction_number" character varying NOT NULL,
                "status" character varying NOT NULL,
                "amount" numeric(10,2) NOT NULL,
                "timestamp" TIMESTAMP NOT NULL,
                "description" text NOT NULL,
                "from" character varying NOT NULL,
                "to" character varying NOT NULL,
                "reference" character varying NOT NULL,
                CONSTRAINT "UQ_transaction_number" UNIQUE ("transaction_number"),
                CONSTRAINT "PK_payment_record_id" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "payment_record"`);
    }
}
