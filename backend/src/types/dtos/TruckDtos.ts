export interface CreateTruckTypeRequest {
  truckTypeName: string;
}

export interface TruckTypeResponse {
  truckTypeId: number;
  truckTypeName: string;
}

export interface CreateTruckRequest {
  truckTypeId: number;
  maxPickups: number;
  maxDropoffs: number;
  dailyOperatingCost: number;
  maxCapacity: number;
  isAvailable?: boolean;
}

export interface UpdateTruckRequest extends Partial<CreateTruckRequest> {}


export interface TruckResponse {
  truckId: number;
  truckTypeId: number;
  truckType: {
    truckTypeId: number;
    truckTypeName: string;
  };
  maxPickups: number;
  maxDropoffs: number;
  dailyOperatingCost: number;
  maxCapacity: number;
  isAvailable: boolean; 
}

export interface TrucksListResponse {
  message: string;
  totalCount: number;
  trucks: TruckResponse[];
}

export interface TruckTypesListResponse {
  message: string;
  totalCount: number;
  truckTypes: TruckTypeResponse[];
}

export interface BulkTruckBreakdownRequest {
  truckTypeName: string; 
  count: number;        
}