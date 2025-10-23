import { Request, Response, NextFunction } from 'express';
import { clientInfoMiddleware } from '../middleware/certMiddleware';

describe('clientInfoMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  it('should set clientName and call next when valid Client-Id is provided', () => {
    const clientId = 'test-client';
    mockRequest.headers = {
      'client-id': clientId
    };

    clientInfoMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect((mockRequest as any).clientName).toBe(clientId);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it('should handle array of Client-Id headers by using first value', () => {
    const clientIds = ['test-client-1', 'test-client-2'];
    mockRequest.headers = {
      'client-id': clientIds
    };

    clientInfoMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect((mockRequest as any).clientName).toBe(clientIds[0]);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should return 403 error when Client-Id header is missing', () => {
    clientInfoMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing Client-Id header. Access denied.'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 error when Client-Id is not a string or string array', () => {
    mockRequest.headers = {
      'client-id': null as any // Invalid type
    };

    clientInfoMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing Client-Id header. Access denied.'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
