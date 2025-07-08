import { SQSClient } from '@aws-sdk/client-sqs';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
const SQS_PICKUP_QUEUE_URL = process.env.SQS_PICKUP_QUEUE_URL || '';
const SQS_DELIVERY_QUEUE_URL = process.env.SQS_DELIVERY_QUEUE_URL || '';

if (!SQS_PICKUP_QUEUE_URL || !SQS_DELIVERY_QUEUE_URL) {
    logger.warn('SQS Queue URLs are not fully set in environment variables. Please configure them in .env');
}

const sqsClient = new SQSClient({
    region: AWS_REGION,
});

export { sqsClient, SQS_PICKUP_QUEUE_URL, SQS_DELIVERY_QUEUE_URL };