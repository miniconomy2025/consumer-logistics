import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

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

export async function getDbCredentials(): Promise<{
  username: string;
  password: string;
  host: string;
  port: number;
  database: string;
}> {
  const secretsClient = new SecretsManagerClient({ region: process.env.REGION });
  const secretId = process.env.DB_SECRET_ID;
  if (!secretId) throw new Error('DB_SECRET_ID is not set');

  const secretValue = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretId })
  );

  if (!secretValue.SecretString) {
    throw new Error('Secret string is empty');
  }

  const secret = JSON.parse(secretValue.SecretString);

  return {
    username: secret.username,
    password: secret.password,
    host: secret.host,
    port: parseInt(secret.port || '5432'),
    database: secret.dbname || secret.database,
  };
}