import { z } from 'zod';

const PaymentSchema = z.object({
  transaction_number: z.string(),
  status: z.string(),
  amount: z.number(),
  timestamp: z.string().refine((val: string) => !isNaN(Date.parse(val)), {
    message: 'Invalid timestamp',
  }),
  description: z.string(),
  from: z.string(),
  to: z.string(),
  reference: z.string(),
});

export const isValidPayment = (body: any): boolean => {
  const result = PaymentSchema.safeParse(body);
  return result.success;
};
