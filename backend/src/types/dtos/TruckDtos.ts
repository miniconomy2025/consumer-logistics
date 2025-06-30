// Request DTO for creating a Truck Type
export interface CreateTruckTypeRequest {
  truckTypeName: string;
}

// Response DTO for a Truck Type
export interface TruckTypeResponse {
  truckTypeId: number;
  truckTypeName: string;
}

// Request DTO for creating a Truck
export interface CreateTruckRequest {
  truckTypeId: number;
  maxPickups: number;
  maxDropoffs: number;
  dailyOperatingCost: number;
  maxCapacity: number;
}

// Request DTO for updating a Truck
export interface UpdateTruckRequest extends Partial<CreateTruckRequest> {}


// Response DTO for a Truck (includes related truck type info)
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

}

// Generic list response
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