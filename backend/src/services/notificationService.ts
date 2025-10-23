import fetch from 'node-fetch';
import { agent } from '../agent'; 
import { logger } from '../utils/logger'; 

export class ExternalNotificationService {
    private readonly COMPANY_DELIVERY_URLS: Record<string, string> = {
        'pear-company': 'https://pear-company-api.projects.bbdgrad.com/public-api/logistics/notification',
        'recycler': 'https://recycler-api.projects.bbdgrad.com/logistics/consumer-deliveries',
        'sumsang-company': 'https://sumsang-phones-api.projects.bbdgrad.com/public-api/logistics/notification',
        'test-company': 'https://webhook.site/948ae0f0-871f-427d-a745-c13e0345dff7'
    };

    private readonly COMPANY_COLLECTION_URLS: Record<string, string> = {
        'pear-company': 'https://pear-company-api.projects.bbdgrad.com/public-api/logistics',
        'recycler': 'https://thoh-api.projects.bbdgrad.com/recycled-phones-collect',
        'sumsang-company': 'https://sumsang-phones-api.projects.bbdgrad.com/public-api/logistics',
        'test-company': 'https://webhook.site/948ae0f0-871f-427d-a745-c13e0345dff7'
    };

    public async notifyExternalDelivery(delivery_reference: string, quantity: number, companyName?: string, model_name?: string, recipient_name?: string): Promise<void> {
        let webhookUrl = 'https://webhook.site/948ae0f0-871f-427d-a745-c13e0345dff7'; // Default fallback
        if (companyName && this.COMPANY_DELIVERY_URLS[companyName]) {
            webhookUrl = this.COMPANY_DELIVERY_URLS[companyName];
            logger.debug(`Using company-specific delivery webhook URL for ${companyName}: ${webhookUrl}`);
        } else {
            logger.debug(`Using default delivery webhook URL for company: ${companyName || 'Unknown'}`);
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            agent: agent,
            body: JSON.stringify({
                delivery_reference,
                status: 'delivered',
                quantity,
                companyName: companyName || 'Unknown',
                modelName: model_name || 'Unknown',
                recipient: recipient_name || 'Not Specified'
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to notify external delivery API for ${companyName || 'Unknown'}: ${response.statusText} (URL: ${webhookUrl})`);
        }

        logger.info(`Delivery notification sent successfully to ${companyName || 'Unknown'} via ${webhookUrl}`);
    }

    public async notifyExternalPickup(delivery_reference: string, quantity: number, companyName?: string, model_name?: string, recipient_name?: string): Promise<void> {
        let webhookUrl = 'https://webhook.site/948ae0f0-871f-427d-a745-c13e0345dff7';
        if (companyName && this.COMPANY_COLLECTION_URLS[companyName]) {
            webhookUrl = this.COMPANY_COLLECTION_URLS[companyName];
            logger.debug(`Using company-specific collection webhook URL for ${companyName}: ${webhookUrl}`);
        } else {
            logger.debug(`Using default collection webhook URL for company: ${companyName || 'Unknown'}`);
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            agent: agent,
            body: JSON.stringify({
                id: delivery_reference,
                type: 'PICKUP',
                quantity,
                companyName: companyName || 'Unknown',
                modelName: model_name || 'Unknown',
                recipient: recipient_name || 'Not Specified'
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to notify external pickup API for ${companyName || 'Unknown'} : ${response.statusText} : ${webhookUrl}`);
        }

        logger.info(`Collection notification sent successfully to ${companyName || 'Unknown'} via ${webhookUrl}`);
    }
}