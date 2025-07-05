export interface CompanyRegistrationRequest {
    company_name: string;
    bank_account_id?: string; 
}

export interface CompanyRegistrationResponse {
    id: number;
    company_name: string;
    bank_account_id: string | null; 
}