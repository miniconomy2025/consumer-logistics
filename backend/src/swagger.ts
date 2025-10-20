export const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "Consumer Logistics API",
    description: "Backend API for Consumer Logistics Management System",
    version: "1.0.0",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server"
    },
    {
      url: "https://afroserve.co.za",
      description: "Production server"
    }
  ],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        description: "Check if the API is running",
        responses: {
          "200": {
            description: "API is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      example: "OK"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/companies": {
      get: {
        summary: "Get all companies",
        description: "Retrieve list of all registered companies",
        responses: {
          "200": {
            description: "List of companies",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/Company"
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: "Register new company",
        description: "Register a new company in the system",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CompanyRegistrationRequest"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Company registered successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CompanyRegistrationResponse"
                }
              }
            }
          },
          "400": {
            description: "Invalid request data"
          }
        }
      }
    },
    "/api/pickups": {
      get: {
        summary: "Get pickups for company",
        description: "Retrieve pickups for a specific company",
        parameters: [
          {
            name: "company_name",
            in: "query",
            required: true,
            schema: {
              type: "string"
            }
          },
          {
            name: "status",
            in: "query",
            required: false,
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "List of pickups",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/ListPickupResponse"
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: "Create pickup",
        description: "Create a new pickup request",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreatePickupRequest"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Pickup created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PickupResponse"
                }
              }
            }
          }
        }
      }
    },
    "/api/trucks": {
      get: {
        summary: "Get all trucks",
        description: "Retrieve list of all trucks in the fleet",
        responses: {
          "200": {
            description: "List of trucks",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/Truck"
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: "Create truck",
        description: "Add a new truck to the fleet",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateTruckRequest"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Truck created successfully"
          }
        }
      }
    },
    "/api/trucks/{id}": {
      get: {
        summary: "Get truck by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer"
            }
          }
        ],
        responses: {
          "200": {
            description: "Truck details",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Truck"
                }
              }
            }
          }
        }
      },
      put: {
        summary: "Update truck",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateTruckRequest"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Truck updated successfully"
          }
        }
      }
    },
    "/api/trucks/types": {
      get: {
        summary: "Get truck types",
        responses: {
          "200": {
            description: "List of truck types",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/TruckType"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/analytics/dashboard": {
      get: {
        summary: "Get dashboard analytics",
        description: "Retrieve dashboard analytics data",
        responses: {
          "200": {
            description: "Dashboard analytics",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DashboardAnalytics"
                }
              }
            }
          }
        }
      }
    },
    "/api/analytics/kpis": {
      get: {
        summary: "Get KPI analytics",
        description: "Retrieve key performance indicators",
        responses: {
          "200": {
            description: "KPI analytics",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/KPIAnalytics"
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      ClientId: {
        type: "apiKey",
        in: "header",
        name: "Client-Id"
      }
    },
    schemas: {
      CompanyRegistrationRequest: {
        type: "object",
        required: ["company_name"],
        properties: {
          company_name: {
            type: "string",
            example: "ABC Logistics"
          },
          bank_account_id: {
            type: "string",
            nullable: true,
            example: "12345678"
          }
        }
      },
      CompanyRegistrationResponse: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            example: 1
          },
          company_name: {
            type: "string",
            example: "ABC Logistics"
          },
          bank_account_id: {
            type: "string",
            nullable: true,
            example: "12345678"
          }
        }
      },
      Company: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            example: 1
          },
          company_name: {
            type: "string",
            example: "ABC Logistics"
          },
          bank_account_id: {
            type: "string",
            nullable: true,
            example: "12345678"
          },
          created_at: {
            type: "string",
            format: "date-time"
          }
        }
      },
      CreatePickupRequest: {
        type: "object",
        required: ["companyName", "quantity"],
        properties: {
          companyName: {
            type: "string",
            example: "ABC Logistics"
          },
          quantity: {
            type: "integer",
            example: 5
          },
          recipient: {
            type: "string",
            nullable: true,
            example: "John Doe"
          },
          modelName: {
            type: "string",
            nullable: true,
            example: "Standard Package"
          }
        }
      },
      PickupResponse: {
        type: "object",
        properties: {
          referenceNo: {
            type: "string",
            example: "REF123456"
          },
          amount: {
            type: "string",
            example: "150.00"
          },
          accountNumber: {
            type: "string",
            example: "ACC789012"
          }
        }
      },
      ListPickupResponse: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            example: 1
          },
          quantity: {
            type: "integer",
            example: 5
          },
          company_name: {
            type: "string",
            example: "ABC Logistics"
          },
          status: {
            type: "string",
            example: "pending"
          },
          recipient_name: {
            type: "string",
            example: "John Doe"
          },
          model_name: {
            type: "string",
            example: "Standard Package"
          },
          amount_due: {
            type: "number",
            example: 150.00
          },
          is_paid: {
            type: "boolean",
            example: false
          }
        }
      },
      Truck: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            example: 1
          },
          license_plate: {
            type: "string",
            example: "ABC-123"
          },
          capacity: {
            type: "number",
            example: 1000.0
          },
          status: {
            type: "string",
            enum: ["available", "in_use", "maintenance", "broken"],
            example: "available"
          },
          truck_type_id: {
            type: "integer",
            example: 1
          }
        }
      },
      TruckType: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            example: 1
          },
          name: {
            type: "string",
            example: "Small Van"
          },
          capacity: {
            type: "number",
            example: 500.0
          },
          cost_per_km: {
            type: "number",
            example: 2.50
          }
        }
      },
      CreateTruckRequest: {
        type: "object",
        required: ["license_plate", "truck_type_id"],
        properties: {
          license_plate: {
            type: "string",
            example: "XYZ-789"
          },
          truck_type_id: {
            type: "integer",
            example: 1
          }
        }
      },
      UpdateTruckRequest: {
        type: "object",
        properties: {
          license_plate: {
            type: "string",
            example: "XYZ-789"
          },
          status: {
            type: "string",
            enum: ["available", "in_use", "maintenance", "broken"],
            example: "maintenance"
          }
        }
      },
      DashboardAnalytics: {
        type: "object",
        properties: {
          total_pickups: {
            type: "integer",
            example: 150
          },
          total_revenue: {
            type: "number",
            example: 15000.00
          },
          active_trucks: {
            type: "integer",
            example: 12
          },
          pending_pickups: {
            type: "integer",
            example: 25
          }
        }
      },
      KPIAnalytics: {
        type: "object",
        properties: {
          pickup_completion_rate: {
            type: "number",
            example: 95.5
          },
          average_delivery_time: {
            type: "number",
            example: 2.5
          },
          truck_utilization: {
            type: "number",
            example: 78.3
          },
          customer_satisfaction: {
            type: "number",
            example: 4.2
          }
        }
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "string",
            example: "Invalid request"
          },
          message: {
            type: "string",
            example: "Company name is required"
          }
        }
      }
    }
  },
  security: [
    {
      ClientId: []
    }
  ]
};