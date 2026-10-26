import "reflect-metadata";
import { createRequire } from "module";
import { KafkaMessage, Producer } from "kafkajs";

import { CrawlCursor } from "../../loader/entities/crawl/crawl-cursor.entity";
import { filteredArticleData } from "../../loader/microservices/manager/services/observador/filteredArticleData";
import { retrievedArticleData } from "../../loader/microservices/manager/services/publico/retrievedArticleData";
import { retrievedPageOldestArticleData } from "../../loader/microservices/manager/services/publico/retrievedPageOldestArticleData";
import { seedOrResume } from "../../loader/microservices/manager/seed";
import { retrievePage } from "../../loader/microservices/worker/services/publico/retrievePage";
import { Publico } from "../../loader/utils/publico";

const nodeRequire = createRequire(__filename);

const commands = ["resume", "seed-twice", "replay-page", "replay-save"] as const;

type Command = (typeof commands)[number];

interface SentRecord {
  topic: string;
  messages: { key?: string | null; value: string | null; headers?: { workIdentity?: string } }[];
}

interface CursorRow {
  outlet: string;
  nextPage: number | null;
  pendingBatches: number[][] | null;
  sentResults: string[];
}

function isCommand(value: string): value is Command {
  return (commands as readonly string[]).includes(value);
}

function kafkaMessage(value: string, headers?: { workIdentity?: string }): KafkaMessage {
  return { value: Buffer.from(value), headers } as KafkaMessage;
}

function recordingProducer(sent: SentRecord[]): Producer {
  return {
    send: async (record: SentRecord) => {
      sent.push({
        topic: record.topic,
        messages: record.messages.map((item) => ({
          key: item.key,
          value: item.value,
          headers: item.headers,
        })),
      });
    },
  } as Producer;
}

function installStore(cursors: CursorRow[]): { articles: { sourceArticleId?: number }[] } {
  const articles: { sourceArticleId?: number; newspaper?: { name?: string } }[] = [];
  const reposKey = Object.keys(nodeRequire.cache).find((key) =>
    key.endsWith("/loader/utils/getRepositories.ts"),
  );
  const repos = reposKey ? nodeRequire.cache[reposKey] : undefined;
  if (!repos) {
    throw new Error("getRepositories module is not loaded");
  }
  const cursorRepository = {
    findOne: async (query: { outlet?: string }) =>
      cursors.find((row) => row.outlet === query.outlet) ?? null,
    save: async (row: CursorRow) => {
      const index = cursors.findIndex((existing) => existing.outlet === row.outlet);
      if (index >= 0) {
        cursors[index] = { ...cursors[index], ...row };
        return cursors[index];
      }
      cursors.push(row);
      return row;
    },
  };
  const articleRepository = {
    find: async () => articles,
    save: async (article: { sourceArticleId?: number }) => {
      articles.push(article);
      return article;
    },
  };
  repos.exports.getRepositories = async () => ({
    connection: {
      transaction: async (work: (manager: { getRepository: (entity: { name: string }) => unknown }) => Promise<void>) => {
        await work({
          getRepository: (entity) => {
            if (entity === CrawlCursor || entity.name === "CrawlCursor") {
              return cursorRepository;
            }
            return articleRepository;
          },
        });
      },
    },
    articleRepository,
    cursorRepository,
    tagRepository: { find: async () => [] },
    authorRepository: { find: async () => [] },
    newspaperRepository: {
      findOne: async (query: { name?: string }) => ({ name: query.name }),
      save: async (row: { name: string }) => row,
    },
  });
  return { articles };
}

async function runResume(): Promise<unknown> {
  const cursors: CursorRow[] = [
    { outlet: "PUBLICO", nextPage: 4, pendingBatches: null, sentResults: [] },
    { outlet: "OBSERVADOR", nextPage: null, pendingBatches: [[1, 2], [3, 4]], sentResults: [] },
  ];
  installStore(cursors);
  const sent: SentRecord[] = [];
  await seedOrResume(recordingProducer(sent));
  return {
    messages: sent.flatMap((record) =>
      record.messages.map((item) => ({ topic: record.topic, key: item.key, value: item.value })),
    ),
    nextPage: cursors.find((row) => row.outlet === "PUBLICO")?.nextPage,
    pendingBatches: cursors.find((row) => row.outlet === "OBSERVADOR")?.pendingBatches,
  };
}

async function runSeedTwice(): Promise<unknown> {
  const cursors: CursorRow[] = [
    { outlet: "PUBLICO", nextPage: 4, pendingBatches: null, sentResults: [] },
  ];
  installStore(cursors);
  const sent: SentRecord[] = [];
  const producer = recordingProducer(sent);
  await seedOrResume(producer);
  await seedOrResume(producer);
  const pageOneSeeds = sent.flatMap((record) => record.messages).filter((item) => item.value === "1");
  return { pageOneSeeds: pageOneSeeds.length, values: sent.flatMap((record) => record.messages.map((item) => item.value)) };
}

async function runReplayPage(): Promise<unknown> {
  installStore([]);
  Publico.getPageData = async () =>
    [
      {
        id: 9,
        titulo: "Uma",
        data: "2020-08-01",
        texto: null,
        url: "/u",
        tags: [],
        autores: [],
      },
    ] as Awaited<ReturnType<typeof Publico.getPageData>>;
  const sent: SentRecord[] = [];
  const producer = recordingProducer(sent);
  const request = kafkaMessage("3");
  await retrievePage(request, producer);
  await retrievePage(request, producer);
  return {
    count: sent.reduce((total, record) => total + record.messages.length, 0),
    workIdentity: sent[0]?.messages[0]?.headers?.workIdentity,
  };
}

async function runReplaySave(): Promise<unknown> {
  const cursors: CursorRow[] = [];
  const store = installStore(cursors);
  const producer = recordingProducer([]);
  const article = JSON.stringify({
    id: 9,
    titulo: "Uma",
    data: "2020-08-01",
    texto: "corpo",
    url: "/u",
    tags: [],
    autores: [],
  });
  await retrievedPageOldestArticleData(
    kafkaMessage(JSON.stringify({ pageOldestArticle: { id: 1 }, pageNumber: 3 })),
    producer,
  );
  await retrievedArticleData(kafkaMessage(article), producer);
  await retrievedArticleData(kafkaMessage(article), producer);
  return {
    rows: store.articles.length,
    nextPage: cursors.find((row) => row.outlet === "PUBLICO")?.nextPage ?? null,
  };
}

async function main(): Promise<void> {
  const commandArg = process.argv[2];
  if (!commandArg || !isCommand(commandArg)) {
    throw new Error(`usage: run_crawl_cursor.ts <${commands.join("|")}>`);
  }
  let result: unknown;
  switch (commandArg) {
    case "resume":
      result = await runResume();
      break;
    case "seed-twice":
      result = await runSeedTwice();
      break;
    case "replay-page":
      result = await runReplayPage();
      break;
    case "replay-save":
      result = await runReplaySave();
      break;
    default: {
      const unexpected: never = commandArg;
      throw new Error(`unexpected command ${String(unexpected)}`);
    }
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

void main();
