import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('bank_account')
export class BankAccountEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    account_number: string;
}