// Request DTO for creating a Pickup
export interface CreatePickupRequest {
  quantity: number;
  customer: string;
}

export interface PickupResponse {
  referenceNo: string;
  amount: string;
}