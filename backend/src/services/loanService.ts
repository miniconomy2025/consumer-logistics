export interface LoanResponse {
  success: boolean;
  loan_number?: string;
}

export async function applyForLoan(amount: number): Promise<LoanResponse> {
  try {
    const response = await fetch('https://<bank-api-domain>/loan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    if (!response.ok) {
      throw new Error(`Bank loan API error: ${response.status} ${response.statusText}`);
    }
    return await response.json() as LoanResponse;
  } catch (error) {
    throw error;
  }
}