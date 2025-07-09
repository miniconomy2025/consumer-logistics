import { MigrationInterface, QueryRunner } from "typeorm";

export class BankAccount1752052863316 implements MigrationInterface {
    name = 'BankAccount1752052863316'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "bank_account" ("id" SERIAL NOT NULL, "account_number" character varying NOT NULL, CONSTRAINT "PK_f3246deb6b79123482c6adb9745" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "invoice" ALTER COLUMN "reference_number" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoice" ALTER COLUMN "reference_number" SET DEFAULT uuid_generate_v4()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoice" ALTER COLUMN "reference_number" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoice" ALTER COLUMN "reference_number" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`DROP TABLE "bank_account"`);
    }

}
