import { hasResult, rememberResult } from "./crawlCursor";

export interface ResultProducer {
  send: (record: {
    topic: string;
    messages: {
      key: string;
      value: string;
      headers?: { workIdentity: string };
    }[];
  }) => Promise<unknown>;
}

export async function sendResultOnce(
  producer: ResultProducer,
  record: { topic: string; key: string; value: string; workIdentity: string },
): Promise<boolean> {
  if (await hasResult(record.workIdentity)) {
    return false;
  }
  await producer.send({
    topic: record.topic,
    messages: [
      {
        key: record.key,
        value: record.value,
        headers: { workIdentity: record.workIdentity },
      },
    ],
  });
  await rememberResult(record.workIdentity);
  return true;
}
