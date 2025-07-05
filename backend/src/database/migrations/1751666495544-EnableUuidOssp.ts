import { MigrationInterface, QueryRunner } from "typeorm";

export class EnableUuidOsspExtension1751666495544 implements MigrationInterface {
  name = 'EnableUuidOsspExtension1751666495544'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp";`);
  }
}
