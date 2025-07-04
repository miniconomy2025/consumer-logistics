// Pickup DTOs for API requests and responses

// Request DTO for creating a Pickup (existing endpoint)
export interface CreatePickupRequest {
  pickupFrom: string; // company_name
  quantity: number;
  deliveryTo: string; // customer
}

// Response DTO for pickup creation (existing endpoint)
export interface PickupCreationResponse {
  referenceNo: string;
  amount: string;
  accountNumber: string;
}

// Request DTO for updating a Pickup
export interface UpdatePickupRequest {
  companyId?: number;
  pickupStatusId?: number;
  pickupDate?: string;
  unitPrice?: number;
  customer?: string;
  invoiceId?: number;
}

// Response DTO for a Pickup (aligned with frontend PickupResponse)
export interface PickupResponse {
  pickupId: number;           // pickup_id
  invoiceId: number;          // invoice_id
  companyId: number;          // company_id
  pickupStatusId: number;     // pickup_status_id
  pickupDate: string | null;  // pickup_date (can be null)
  unitPrice: number;          // unit_price
  customer: string;           // customer
  // Optional populated relationships
  pickupStatus?: {
    pickupStatusId: number;
    statusName: string;       // status_name from PickupStatusEntity
  };
  company?: {
    companyId: number;
    companyName: string;      // company_name from CompanyEntity
  };
  invoice?: {
    invoiceId: number;
    referenceNumber: string;  // reference_number from InvoiceEntity
    totalAmount: number;      // total_amount from InvoiceEntity
    paid: boolean;            // paid from InvoiceEntity
  };
}

// Generic list response for pickups
export interface PickupsListResponse {
  message: string;
  totalCount: number;
  pickups: PickupResponse[];
}

// Search parameters for pickups
export interface PickupSearchParams {
  companyId?: number;
  pickupStatusId?: number;
  dateFrom?: string;
  dateTo?: string;
  customer?: string;
  limit?: number;
  offset?: number;
}

// Pickup status response
export interface PickupStatusResponse {
  pickupStatusId: number;
  statusName: string;
}

// Analytics response for pickups
export interface PickupAnalyticsResponse {
  totalPickups: number;
  totalRevenue: number;
  averageOrderValue: number;
  pendingPickups: number;
  completedPickups: number;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
  topCompanies: Array<{
    companyId: number;
    companyName: string;
    totalPickups: number;
    totalRevenue: number;
  }>;
  statusDistribution: Array<{
    statusName: string;
    count: number;
    percentage: number;
  }>;
}