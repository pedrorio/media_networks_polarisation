export type Outlet = "PUBLICO" | "OBSERVADOR";

export interface CrawlWorkMessage {
  value: string;
  key: string;
}

export interface QueuedCrawlWork {
  outlet: Outlet;
  topic: string;
  value: string;
  key: string;
}

export interface CrawlFanoutState {
  outstanding: Record<Outlet, number>;
  queued: QueuedCrawlWork[];
}

export interface CrawlProducer {
  send: (record: { topic: string; messages: CrawlWorkMessage[] }) => Promise<unknown>;
}

export const crawlFanout: CrawlFanoutState = {
  outstanding: { PUBLICO: 0, OBSERVADOR: 0 },
  queued: [],
};

export function outstandingCap(): number {
  const raw = process.env.CRAWL_OUTSTANDING_CAP;
  if (raw === undefined || raw === "") {
    return 32;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("CRAWL_OUTSTANDING_CAP must be a positive integer");
  }
  return parsed;
}

export async function enqueueCrawlWork(
  state: CrawlFanoutState,
  outlet: Outlet,
  topic: string,
  messages: CrawlWorkMessage[],
  producer: CrawlProducer,
): Promise<void> {
  for (const message of messages) {
    state.queued.push({ outlet, topic, value: message.value, key: message.key });
  }
  await drainCrawlWork(state, producer);
}

export async function completeCrawlWork(
  state: CrawlFanoutState,
  outlet: Outlet,
  producer: CrawlProducer,
): Promise<void> {
  if (state.outstanding[outlet] > 0) {
    state.outstanding[outlet] -= 1;
  }
  await drainCrawlWork(state, producer);
}

async function drainCrawlWork(state: CrawlFanoutState, producer: CrawlProducer): Promise<void> {
  const cap = outstandingCap();
  const ready: QueuedCrawlWork[] = [];
  const waiting: QueuedCrawlWork[] = [];
  for (const item of state.queued) {
    if (state.outstanding[item.outlet] < cap) {
      state.outstanding[item.outlet] += 1;
      ready.push(item);
    } else {
      waiting.push(item);
    }
  }
  state.queued = waiting;

  const byTopic = new Map<string, CrawlWorkMessage[]>();
  for (const item of ready) {
    const batch = byTopic.get(item.topic) ?? [];
    batch.push({ value: item.value, key: item.key });
    byTopic.set(item.topic, batch);
  }
  for (const [topic, messages] of byTopic) {
    await producer.send({ topic, messages });
  }
}
