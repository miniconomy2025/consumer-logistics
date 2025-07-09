export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: Record<string, unknown> | string | FormData;
  params?: Record<string, string | number | boolean | undefined>;
}
