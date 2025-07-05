// Request DTO for creating a Pickup
export interface CreatePickupRequest {
  pickupFrom: string; // company_name
  quantity: number;
  deliveryTo: string; // customer
}

export interface PickupResponse {
  referenceNo: string;
  amount: string;
  accountNumber: string;
}