export interface ErrorResponse {
  status: 'fail' | 'error';
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
  method: string;
  requestId: string;
  stack?: string;
}
