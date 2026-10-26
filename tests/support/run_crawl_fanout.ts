import "reflect-metadata";
import { createRequire } from "module";
import * as fs from "fs";
import { KafkaMessage, Producer } from "kafkajs";

import { filteredArticleData } from "../../loader/microservices/manager/services/observador/filteredArticleData";
import { retrievedArticleData } from "../../loader/microservices/manager/services/publico/retrievedArticleData";
import { retrievedMostRecentArticleData } from "../../loader/microservices/manager/services/observador/retrievedMostRecentArticleData";
import { retrievedPageData } from "../../loader/microservices/manager/services/publico/retrievedPageData";
import { crawlFanout } from "../../loader/utils/crawlFanout";

const nodeRequire = createRequire(__filename);

const commands = ["observador", "publico"] as const;

type Command = (typeof commands)[number];

interface SentRecord {
  topic: string;
  messages: { key: string; value: string }[];
}

function isCommand(value: string): value is Command {
  return (commands as readonly string[]).includes(value);
}

function kafkaMessage(value: string): KafkaMessage {
  return { value: Buffer.from(value) } as KafkaMessage;
}

function recordingProducer(sent: SentRecord[]): Producer {
  return {
    send: async (record: SentRecord) => {
      sent.push({
        topic: record.topic,
        messages: record.messages.map((item) => ({ key: item.key, value: item.value })),
      });
    },
  } as Producer;
}

function resetFanout(): void {
  crawlFanout.outstanding.PUBLICO = 0;
  crawlFanout.outstanding.OBSERVADOR = 0;
  crawlFanout.queued.splice(0, crawlFanout.queued.length);
}

function installEmptyRepositories(): void {
  const reposKey = Object.keys(nodeRequire.cache).find((key) =>
    key.endsWith("/loader/utils/getRepositories.ts"),
  );
  const repos = reposKey ? nodeRequire.cache[reposKey] : undefined;
  if (!repos) {
    throw new Error("getRepositories module is not loaded");
  }
  const articles: { sourceArticleId?: number; newspaper?: { name?: string } }[] = [];
  repos.exports.getRepositories = async () => ({
    articleRepository: {
      find: async () => articles,
      save: async (article: { sourceArticleId?: number; newspaper?: { name?: string } }) => {
        articles.push(article);
        return article;
      },
    },
    tagRepository: { find: async () => [] },
    authorRepository: { find: async () => [] },
    newspaperRepository: {
      findOne: async () => ({ name: "OBSERVADOR" }),
      save: async (row: { name: string }) => row,
    },
  });
}

function pageArticles(): unknown[] {
  return [1, 2, 3].map((id) => ({
    id,
    titulo: `Titulo ${id}`,
    data: "2020-08-01",
    texto: "corpo",
    url: `/2020/08/01/${id}`,
    tags: [],
    autores: [],
  }));
}

async function runObservador(cap: number): Promise<unknown> {
  process.env.CRAWL_OUTSTANDING_CAP = String(cap);
  resetFanout();
  installEmptyRepositories();
  const sent: SentRecord[] = [];
  const producer = recordingProducer(sent);
  await retrievedMostRecentArticleData(
    kafkaMessage(JSON.stringify({ id: 2500 })),
    producer,
  );
  const beforeCompletion = sent.map((record) => record.messages.length);
  await filteredArticleData(
    kafkaMessage(JSON.stringify({
      id: 1,
      title: "Primeiro",
      date: { datetime: "2020-08-01T00:00:00.000Z" },
      categories: [],
      textCredits: [],
      content: "corpo",
    })),
    producer,
  );
  return {
    beforeCompletion,
    sendSizes: sent.map((record) => record.messages.length),
    keys: sent.flatMap((record) => record.messages.map((item) => item.key)),
  };
}

async function runPublico(cap: number): Promise<unknown> {
  process.env.CRAWL_OUTSTANDING_CAP = String(cap);
  resetFanout();
  installEmptyRepositories();
  const sent: SentRecord[] = [];
  const producer = recordingProducer(sent);
  await retrievedPageData(kafkaMessage(JSON.stringify(pageArticles())), producer);
  const beforeCompletion = sent.map((record) => record.messages.length);
  await retrievedArticleData(
    kafkaMessage(JSON.stringify(pageArticles()[0])),
    producer,
  );
  return {
    beforeCompletion,
    sendSizes: sent.map((record) => record.messages.length),
    keys: sent.flatMap((record) => record.messages.map((item) => item.key)),
  };
}

async function main(): Promise<void> {
  const commandArg = process.argv[2];
  const inputPath = process.argv[3];
  if (!commandArg || !inputPath || !isCommand(commandArg)) {
    throw new Error(`usage: run_crawl_fanout.ts <${commands.join("|")}> <input.json>`);
  }
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8")) as { cap: number };
  let result: unknown;
  switch (commandArg) {
    case "observador":
      result = await runObservador(input.cap);
      break;
    case "publico":
      result = await runPublico(input.cap);
      break;
    default: {
      const unexpected: never = commandArg;
      throw new Error(`unexpected command ${String(unexpected)}`);
    }
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

void main();
