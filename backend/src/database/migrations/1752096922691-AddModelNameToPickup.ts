import { MigrationInterface, QueryRunner } from "typeorm";

export class AddModelNameToPickup1752096922691 implements MigrationInterface {
    name = 'AddModelNameToPickup1752096922691'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pickup" ADD "model_name" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "invoice" ALTER COLUMN "reference_number" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoice" ALTER COLUMN "reference_number" SET DEFAULT uuid_generate_v4()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoice" ALTER COLUMN "reference_number" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoice" ALTER COLUMN "reference_number" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "pickup" DROP COLUMN "model_name"`);
    }

}
