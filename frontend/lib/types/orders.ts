export interface RecentOrderItem {
  pickupId: number;
  companyId: number;
  companyName: string;
  customer: string;
  amount: number;
  status: string;
  date: string | null; // ISO string or null
}

export interface RecentOrdersResponse {
  items: RecentOrderItem[];
}

