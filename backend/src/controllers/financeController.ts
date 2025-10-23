import { Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';
import { BANK_API_URL } from '../config/apiConfig';
import { agent } from '../agent';
import { logger } from '../utils/logger';

export class FinanceController {
  public getAccountSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = `${BANK_API_URL}/account/me`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Client-Id': 'consumer-logistics' },
        agent,
      });
      const data = await response.json();
      if (!response.ok) {
        logger.error('Bank account/me error', data);
        return res.status(response.status).json({ message: 'Failed to fetch bank account', details: data });
      }
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };

  public getLoanStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = `${BANK_API_URL}/loan`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Client-Id': 'consumer-logistics' },
        agent,
      });
      const data = await response.json();
      if (!response.ok) {
        logger.error('Bank loan status error', data);
        return res.status(response.status).json({ message: 'Failed to fetch loan status', details: data });
      }
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };
}

