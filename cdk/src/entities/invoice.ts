import { Entity, PrimaryGeneratedColumn, Column, OneToOne, OneToMany } from 'typeorm';
import { Pickup } from './pickup';
import { TransactionLedger } from './transaction-ledger';

@Entity()
export class Invoice {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'reference_number', type: 'uuid', unique: true, default: () => 'uuid_generate_v4()' })
    referenceNumber: string;

    @Column('decimal')
    totalAmount: number;

    @Column('boolean', { default: false })
    paid: boolean;

    @OneToOne(() => Pickup, (pickup) => pickup.invoice)
    pickup: Pickup;

    @OneToMany(() => TransactionLedger, (tx) => tx.invoice)
    transactions: TransactionLedger[];
}