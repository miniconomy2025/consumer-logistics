import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PickupEntity } from './PickupEntity';
import { TransactionEntity } from './TransactionEntity';

@Entity('invoice')
export class InvoiceEntity {
    @PrimaryGeneratedColumn({ name: 'invoice_id' })
    invoice_id: number;

    @Column({ name: 'reference_number', type: 'uuid', unique: true, default: () => 'uuid_generate_v4()' })
    reference_number: string;

    @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
    total_amount: number;

    @Column({ name: 'paid', type: 'boolean' })
    paid: boolean;

    @OneToMany(() => PickupEntity, pickup => pickup.invoice) 
    pickups: PickupEntity[];

    @OneToMany(() => TransactionEntity, transaction => transaction.invoice)
    transactions: TransactionEntity[];
}