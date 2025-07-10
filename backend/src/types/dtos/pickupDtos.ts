export interface CreatePickupRequest {
    companyName: string;
    quantity: number;
    recipient?: string | null;
    modelName?: string | null;
}


export interface PickupResponse {
    referenceNo: string; 
    amount: string;
    accountNumber: string;
}

export interface GetPickupsRequest {
    company_name: string;
    status?: string;
}

export interface ListPickupResponse {
    id: number;
    quantity: number;
    company_name: string;
    status: string;
    recipient_name: string;
    model_name: string;
    amount_due: number;
    is_paid: boolean;
}