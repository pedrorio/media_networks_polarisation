import { deadLetterTopic } from "../constants";

export const HANDLER_ATTEMPTS = 5;

export interface CrawlDelivery {
  topic: string;
  partition: number;
  offset: string;
  key: string | null;
  value: string | null;
}

export interface DeadLetterProducer {
  send: (record: { topic: string; messages: { value: string }[] }) => Promise<unknown>;
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function handleDelivery(
  delivery: CrawlDelivery,
  handler: () => Promise<void>,
  producer: DeadLetterProducer,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= HANDLER_ATTEMPTS; attempt += 1) {
    try {
      await handler();
      return;
    } catch (error) {
      lastError = error;
    }
  }

  await producer.send({
    topic: deadLetterTopic,
    messages: [
      {
        value: JSON.stringify({
          topic: delivery.topic,
          partition: delivery.partition,
          offset: delivery.offset,
          key: delivery.key,
          value: delivery.value,
          error: errorText(lastError),
        }),
      },
    ],
  });
}
