import "reflect-metadata";
import axios from "axios";
import { createRequire } from "module";
import * as fs from "fs";
import { KafkaMessage, Producer } from "kafkajs";

import { Publico } from "../../loader/utils/publico";
import { retrieveArticle } from "../../loader/microservices/worker/services/publico/retrieveArticle";
import { retrievePage } from "../../loader/microservices/worker/services/publico/retrievePage";
import { retrievedPageData } from "../../loader/microservices/manager/services/publico/retrievedPageData";

const nodeRequire = createRequire(__filename);

const commands = ["page", "article", "manager"] as const;

type Command = (typeof commands)[number];

interface SentRecord {
  topic: string;
  messages: { key: string; value: string }[];
}

interface PageInput {
  pageNumber: string;
  articles: unknown[];
}

interface ArticleInput {
  url: string;
}

interface ManagerInput {
  pageValue: string;
  existingTitles: string[];
}

function isCommand(value: string): value is Command {
  return (commands as readonly string[]).includes(value);
}

function message(value: string): KafkaMessage {
  return { value: Buffer.from(value) } as KafkaMessage;
}

function recordingProducer(sent: SentRecord[]): Producer {
  return {
    send: async (record: SentRecord) => {
      sent.push(record);
    },
  } as Producer;
}

function installCursorRepository(): void {
  const cursors: { outlet: string; sentResults: string[] }[] = [];
  const reposKey = Object.keys(nodeRequire.cache).find((key) =>
    key.endsWith("/loader/utils/getRepositories.ts"),
  );
  const repos = reposKey ? nodeRequire.cache[reposKey] : undefined;
  if (!repos) {
    throw new Error("getRepositories module is not loaded");
  }
  repos.exports.getRepositories = async () => ({
    cursorRepository: {
      findOne: async (query: { outlet: string }) =>
        cursors.find((row) => row.outlet === query.outlet) ?? null,
      save: async (row: { outlet: string; sentResults: string[] }) => {
        const index = cursors.findIndex((existing) => existing.outlet === row.outlet);
        if (index >= 0) {
          cursors[index] = row;
          return row;
        }
        cursors.push(row);
        return row;
      },
    },
  });
}

async function runPage(input: PageInput): Promise<unknown> {
  installCursorRepository();
  let requestedPage: number | undefined;
  Publico.getPageData = async (pageNumber: number) => {
    requestedPage = pageNumber;
    return input.articles as Awaited<ReturnType<typeof Publico.getPageData>>;
  };
  const sent: SentRecord[] = [];
  await retrievePage(message(input.pageNumber), recordingProducer(sent));
  return {
    requestedPage,
    sends: sent.map((record) => ({
      topic: record.topic,
      messages: record.messages.map((item) => ({
        key: item.key,
        value: JSON.parse(item.value) as unknown,
      })),
    })),
  };
}

async function runArticle(input: ArticleInput): Promise<unknown> {
  let requestedUrl: string | undefined;
  const originalGet = axios.get;
  axios.get = (async (url: string) => {
    requestedUrl = url;
    return { data: "<div class=\"story__body\"><p>Corpo</p></div>" };
  }) as typeof axios.get;
  try {
    const sent: SentRecord[] = [];
    await retrieveArticle(message(JSON.stringify(input)), recordingProducer(sent));
    return {
      requestedUrl,
      sends: sent.map((record) => ({
        topic: record.topic,
        messages: record.messages.map((item) => ({
          key: item.key,
          value: JSON.parse(item.value) as unknown,
        })),
      })),
    };
  } finally {
    axios.get = originalGet;
  }
}

function stubExistingTitles(existingTitles: string[]): void {
  const reposKey = Object.keys(nodeRequire.cache).find((key) =>
    key.endsWith("/loader/utils/getRepositories.ts"),
  );
  const repos = reposKey ? nodeRequire.cache[reposKey] : undefined;
  if (!repos) {
    throw new Error("getRepositories module is not loaded");
  }
  repos.exports.getRepositories = async () => ({
    articleRepository: {
      find: async () => existingTitles.map((title) => ({ title })),
    },
  });
}

async function runManager(input: ManagerInput): Promise<unknown> {
  stubExistingTitles(input.existingTitles);
  const sent: SentRecord[] = [];
  await retrievedPageData(message(input.pageValue), recordingProducer(sent));
  return {
    sends: sent.map((record) => ({
      topic: record.topic,
      messages: record.messages.map((item) => ({
        key: item.key,
        value: JSON.parse(item.value) as unknown,
      })),
    })),
  };
}

async function main(): Promise<void> {
  const commandArg = process.argv[2];
  const inputPath = process.argv[3];
  if (!commandArg || !inputPath || !isCommand(commandArg)) {
    throw new Error(`usage: run_publico_payloads.ts <${commands.join("|")}> <input.json>`);
  }
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8")) as unknown;
  let result: unknown;
  switch (commandArg) {
    case "page":
      result = await runPage(input as PageInput);
      break;
    case "article":
      result = await runArticle(input as ArticleInput);
      break;
    case "manager":
      result = await runManager(input as ManagerInput);
      break;
    default: {
      const unexpected: never = commandArg;
      throw new Error(`unexpected command ${String(unexpected)}`);
    }
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

void main();
