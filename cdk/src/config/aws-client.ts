import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const DEFAULT_REGION = 'af-south-1';
const REGION = process.env.REGION || DEFAULT_REGION;

const sqs = new SQSClient({ region: REGION });

export const sendToSQS = async (message: string, queueUrl: string) => {
  console.log(`Sending message to SQS queue: ${queueUrl}`);
  const command = new SendMessageCommand({
    MessageBody: message,
    QueueUrl: queueUrl
  });
  console.log(`Message to send: ${message}`);
  const sqsReturn = await sqs.send(command);
  console.log(`SQS response: ${JSON.stringify(sqsReturn)}`);
  if (!sqsReturn.MessageId) {
    throw new Error(`Failed to send message ${message} to SQS queue`);
  }
}
