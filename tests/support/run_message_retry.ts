import "reflect-metadata";
import * as fs from "fs";

import { handleDelivery } from "../../loader/utils/handleDelivery";

const commands = ["budget", "dead-letter", "produce-fails", "poison"] as const;

type Command = (typeof commands)[number];

interface DeliveryInput {
  topic: string;
  partition: number;
  offset: string;
  key: string | null;
  value: string | null;
}

function isCommand(value: string): value is Command {
  return (commands as readonly string[]).includes(value);
}

async function runBudget(): Promise<unknown> {
  let attempts = 0;
  const deadLetters: string[] = [];
  await handleDelivery(
    { topic: "PUBLICO", partition: 0, offset: "4", key: "RETRIEVE_PAGE", value: "1" },
    async () => {
      attempts += 1;
      throw new Error("boom");
    },
    {
      send: async (record) => {
        deadLetters.push(...record.messages.map((item) => item.value));
      },
    },
  );
  return { attempts, deadLetters: deadLetters.length };
}

async function runDeadLetter(input: DeliveryInput): Promise<unknown> {
  const deadLetters: { topic: string; value: string }[] = [];
  await handleDelivery(
    input,
    async () => {
      throw new Error("boom");
    },
    {
      send: async (record) => {
        for (const item of record.messages) {
          deadLetters.push({ topic: record.topic, value: item.value });
        }
      },
    },
  );
  return {
    deadLetterTopic: deadLetters[0]?.topic,
    records: deadLetters.map((item) => JSON.parse(item.value) as unknown),
  };
}

async function runProduceFails(input: DeliveryInput): Promise<unknown> {
  let committed = false;
  let produceAttempts = 0;
  try {
    await handleDelivery(
      input,
      async () => {
        throw new Error("boom");
      },
      {
        send: async () => {
          produceAttempts += 1;
          throw new Error("produce failed");
        },
      },
    );
    committed = true;
  } catch (error) {
    committed = false;
    return {
      committed,
      produceAttempts,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  return { committed, produceAttempts, error: null };
}

async function runPoison(): Promise<unknown> {
  const deliveries: DeliveryInput[] = [
    { topic: "PUBLICO", partition: 0, offset: "0", key: "RETRIEVE_PAGE", value: "1" },
    { topic: "PUBLICO", partition: 0, offset: "1", key: "RETRIEVE_PAGE", value: "2" },
    { topic: "PUBLICO", partition: 0, offset: "2", key: "RETRIEVE_ARTICLE", value: "{}" },
  ];
  const attempts = new Map<string, number>();
  const committed: string[] = [];
  const deadLetters: string[] = [];
  const producer = {
    send: async (record: { topic: string; messages: { value: string }[] }) => {
      deadLetters.push(...record.messages.map((item) => item.value));
    },
  };

  async function consume(pending: DeliveryInput[]): Promise<void> {
    for (const delivery of pending) {
      try {
        await handleDelivery(
          delivery,
          async () => {
            const count = (attempts.get(delivery.offset) ?? 0) + 1;
            attempts.set(delivery.offset, count);
            if (delivery.offset === "1") {
              throw new Error("poison");
            }
          },
          producer,
        );
        committed.push(delivery.offset);
      } catch {
        break;
      }
    }
  }

  await consume(deliveries);
  const pending = deliveries.filter((delivery) => !committed.includes(delivery.offset));
  const attemptsBeforeRestart = attempts.get("1") ?? 0;
  await consume(pending);
  return {
    committed,
    poisonAttempts: attempts.get("1") ?? 0,
    restartedAttempts: (attempts.get("1") ?? 0) - attemptsBeforeRestart,
    deadLetters: deadLetters.length,
  };
}

async function main(): Promise<void> {
  const commandArg = process.argv[2];
  const inputPath = process.argv[3];
  if (!commandArg || !isCommand(commandArg)) {
    throw new Error(`usage: run_message_retry.ts <${commands.join("|")}> [input.json]`);
  }
  const input = inputPath
    ? (JSON.parse(fs.readFileSync(inputPath, "utf8")) as DeliveryInput)
    : undefined;
  let result: unknown;
  switch (commandArg) {
    case "budget":
      result = await runBudget();
      break;
    case "dead-letter":
      result = await runDeadLetter(input as DeliveryInput);
      break;
    case "produce-fails":
      result = await runProduceFails(input as DeliveryInput);
      break;
    case "poison":
      result = await runPoison();
      break;
    default: {
      const unexpected: never = commandArg;
      throw new Error(`unexpected command ${String(unexpected)}`);
    }
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

void main();
