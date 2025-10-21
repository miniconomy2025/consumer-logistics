import { agent } from '../agent';
import { BANK_API_URL } from '../config/apiConfig';
import fetch from 'node-fetch';

export interface LoanResponse {
  success: boolean;
  loan_number?: string;
}

export async function applyForLoan(amount: number): Promise<LoanResponse> {
  try {
    const response = await fetch(`${BANK_API_URL}/loan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' 
        , 'Client-Id': 'consumer-logistics'
      },
      agent: agent,
      body: JSON.stringify({ amount }),
    });
    if (!response.ok) {
      throw new Error(`Bank loan API error: ${response.status} ${response.statusText}`);
    }
    return await response.json() as LoanResponse;
  } catch (error) {
    throw error;
  }
}

export async function applyForLoanWithFallback(
  amount: number,
  minAmount: number = 1000,
  fallbackRatio: number = 0.8
): Promise<{ response: LoanResponse; attemptedAmount: number }> {
  let response = await applyForLoan(amount);
  if (response.success) {
    return { response, attemptedAmount: amount };
  }
  // Fallback: try with a smaller amount
  const fallbackAmount = Math.max(Math.floor(amount * fallbackRatio), minAmount);
  if (fallbackAmount < amount) {
    response = await applyForLoan(fallbackAmount);
    return { response, attemptedAmount: fallbackAmount };
  }
  return { response, attemptedAmount: amount };
}