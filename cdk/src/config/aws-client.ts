import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const DEFAULT_REGION = 'af-south-1';
const REGION = process.env.REGION || DEFAULT_REGION;

export const sendToSQS = async (message: string, queueUrl: string) => {
    const sqs = new SQSClient( { region: REGION });
    const command = new SendMessageCommand({
        MessageBody: message,
        QueueUrl: queueUrl
    });

    const sqsReturn = await sqs.send(command);
    if (!sqsReturn.MessageId) {
        throw new Error(`Failed to send message ${message} to SQS queue`);
    }
}