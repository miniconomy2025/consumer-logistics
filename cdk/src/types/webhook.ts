export interface PaymentWebhookPayload {
  transaction_number: string;
  status: 'SUCCESS' | 'FAILED';
  amount: number;
  // timestamp: string;
  description: string;
  // from: string;
  // to: string;
  // reference: string; 
}


