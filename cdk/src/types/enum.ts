export enum OrderStatus {
  AwaitingPayment = 'Awaiting Payment',
  PartiallyPaid = 'Partially Paid',
  Paid = 'Paid To Logistics Co',
  ReadyForPickup = 'Ready For Pickup',
  OutForDelivery = 'Out For Delivery',
  Delivered = 'Delivered',
  Cancelled = 'Cancelled',
}
export enum TransactionTypeName {
  BusinessExpense = 'Business Expense',
  PaymentReceived = 'Payment Received',
  Refund = 'Refund',
  LoanDisbursement = 'Loan Disbursement',
  LoanRepayment = 'Loan Repayment',
}




