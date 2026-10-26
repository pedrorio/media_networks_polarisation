import "reflect-metadata";
import axios from "axios";
import { createRequire } from "module";
import * as fs from "fs";
import { KafkaMessage, Producer } from "kafkajs";

import { ArticleDTO } from "../../loader/entities/article/article.dto";
import { filteredArticleData } from "../../loader/microservices/manager/services/observador/filteredArticleData";
import { retrievedArticleData } from "../../loader/microservices/manager/services/publico/retrievedArticleData";
import { filterArticles } from "../../loader/microservices/worker/services/observador/filterArticle";
import { retrieveArticle } from "../../loader/microservices/worker/services/publico/retrieveArticle";
import { getObservadorData } from "../../loader/scripts/observador";
import { Observador } from "../../loader/utils/observador";
import { Publico } from "../../loader/utils/publico";
import { addUniqueNewspaper } from "../../loader/utils/addUniqueNewspaper";

const nodeRequire = createRequire(__filename);

const commands = [
  "map",
  "save-observador",
  "save-again",
  "save-race",
  "save-same-title",
  "newspaper",
  "script",
  "produce",
] as const;

type Command = (typeof commands)[number];

interface ArticleRow {
  title?: string;
  text?: string;
  sourceArticleId?: number;
  newspaper?: { name?: string };
}

interface MemoryStore {
  articles: ArticleRow[];
  newspapers: { name: string }[];
  newspaperSaves: unknown[];
  missLookup: boolean;
}

function isCommand(value: string): value is Command {
  return (commands as readonly string[]).includes(value);
}

function message(value: string): KafkaMessage {
  return { value: Buffer.from(value) } as KafkaMessage;
}

function createStore(seedNewspapers: { name: string }[], missLookup: boolean): MemoryStore {
  return { articles: [], newspapers: seedNewspapers, newspaperSaves: [], missLookup };
}

function installStore(store: MemoryStore): void {
  const reposKey = Object.keys(nodeRequire.cache).find((key) =>
    key.endsWith("/loader/utils/getRepositories.ts"),
  );
  const repos = reposKey ? nodeRequire.cache[reposKey] : undefined;
  if (!repos) {
    throw new Error("getRepositories module is not loaded");
  }
  repos.exports.getRepositories = async () => ({
    connection: { close: async () => undefined },
    articleRepository: {
      find: async (query: { title?: string; sourceArticleId?: number } = {}) => {
        if (store.missLookup) {
          return [];
        }
        return store.articles.filter((row) => {
          if (query.sourceArticleId !== undefined && row.sourceArticleId !== query.sourceArticleId) {
            return false;
          }
          if (query.title !== undefined && row.title !== query.title) {
            return false;
          }
          return true;
        });
      },
      findOne: async (query: { sourceArticleId?: number; newspaper?: { name?: string } } = {}) => {
        if (store.missLookup) {
          return null;
        }
        return (
          store.articles.find(
            (row) =>
              row.sourceArticleId === query.sourceArticleId &&
              row.newspaper?.name === query.newspaper?.name,
          ) ?? null
        );
      },
      save: async (article: ArticleRow) => {
        const duplicate = store.articles.some(
          (row) =>
            row.sourceArticleId !== undefined &&
            row.sourceArticleId === article.sourceArticleId &&
            row.newspaper?.name === article.newspaper?.name,
        );
        if (duplicate) {
          const error = new Error("duplicate key") as Error & { code: string };
          error.code = "23505";
          throw error;
        }
        store.articles.push(article);
        return article;
      },
    },
    tagRepository: { find: async () => [] },
    authorRepository: { find: async () => [] },
    newspaperRepository: {
      findOne: async (query: { name?: string }) =>
        store.newspapers.find((row) => row.name === query.name) ?? null,
      save: async (row: { name?: string }) => {
        store.newspaperSaves.push(row);
        if (typeof row.name === "string") {
          store.newspapers.push({ name: row.name });
        }
        return row;
      },
    },
  });
}

function plain(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function runMap(input: { publico: Parameters<typeof Publico.transformArticle>[0]; observador: Parameters<typeof Observador.transformArticleBulk>[0] }): unknown {
  return {
    publico: plain(ArticleDTO.toArticle(Publico.transformArticle(input.publico))),
    observador: plain(ArticleDTO.toArticle(Observador.transformArticleBulk(input.observador))),
  };
}

async function runSaveObservador(input: { article: unknown }): Promise<unknown> {
  const store = createStore([], false);
  installStore(store);
  await filteredArticleData(message(JSON.stringify(input.article)));
  return { rows: store.articles };
}

async function runSaveAgain(input: { publico: unknown; observador: unknown }): Promise<unknown> {
  const store = createStore([], false);
  installStore(store);
  await retrievedArticleData(message(JSON.stringify(input.publico)));
  await retrievedArticleData(message(JSON.stringify(input.publico)));
  await filteredArticleData(message(JSON.stringify(input.observador)));
  await filteredArticleData(message(JSON.stringify(input.observador)));
  return {
    publicoCount: store.articles.filter((row) => row.newspaper?.name === "PUBLICO").length,
    observadorCount: store.articles.filter((row) => row.newspaper?.name === "OBSERVADOR").length,
    uniqueViolationRaised: false,
  };
}

async function runSaveRace(input: { publico: unknown }): Promise<unknown> {
  const store = createStore([], true);
  installStore(store);
  await retrievedArticleData(message(JSON.stringify(input.publico)));
  await retrievedArticleData(message(JSON.stringify(input.publico)));
  return { rows: store.articles.length };
}

async function runSaveSameTitle(input: { articles: unknown[] }): Promise<unknown> {
  const store = createStore([], false);
  installStore(store);
  for (const article of input.articles) {
    await filteredArticleData(message(JSON.stringify(article)));
  }
  return { rows: store.articles };
}

async function runNewspaper(input: { article: Parameters<typeof Publico.transformArticle>[0] }): Promise<unknown> {
  const store = createStore([{ name: "OBSERVADOR" }], false);
  installStore(store);
  const article = ArticleDTO.toArticle(Publico.transformArticle(input.article));
  await addUniqueNewspaper(article);
  return {
    articleNewspaper: article.newspaper?.name,
    newspaperSaves: store.newspaperSaves,
  };
}

async function runScript(input: { mostRecentId: number; articles: unknown[] }): Promise<unknown> {
  const store = createStore([], false);
  installStore(store);
  Observador.getMostRecentArticle = async () => ({ id: input.mostRecentId } as Awaited<ReturnType<typeof Observador.getMostRecentArticle>>);
  Observador.getFilteredArticles = async () => input.articles as Awaited<ReturnType<typeof Observador.getFilteredArticles>>;
  await getObservadorData();
  await getObservadorData();
  return { rows: store.articles };
}

async function runProduce(input: { publico: { url: string }; observador: unknown }): Promise<unknown> {
  const originalGet = axios.get;
  axios.get = (async () => ({ data: "<div class=\"story__body\"><p>Corpo</p></div>" })) as typeof axios.get;
  Observador.getFilteredArticles = async () => [input.observador] as Awaited<ReturnType<typeof Observador.getFilteredArticles>>;
  try {
    const publicoSent: { value: string }[] = [];
    const observadorSent: { value: string }[] = [];
    const publicoProducer = {
      send: async (record: { messages: { value: string }[] }) => {
        publicoSent.push(...record.messages);
      },
    } as Producer;
    const observadorProducer = {
      send: async (record: { messages: { value: string }[] }) => {
        observadorSent.push(...record.messages);
      },
    } as Producer;
    await retrieveArticle(message(JSON.stringify(input.publico)), publicoProducer);
    await filterArticles(message(JSON.stringify([1])), observadorProducer);
    return {
      publico: JSON.parse(publicoSent[0].value) as unknown,
      observador: JSON.parse(observadorSent[0].value) as unknown,
    };
  } finally {
    axios.get = originalGet;
  }
}

async function main(): Promise<void> {
  const commandArg = process.argv[2];
  const inputPath = process.argv[3];
  if (!commandArg || !inputPath || !isCommand(commandArg)) {
    throw new Error(`usage: run_article_writes.ts <${commands.join("|")}> <input.json>`);
  }
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8")) as Record<string, unknown>;
  let result: unknown;
  switch (commandArg) {
    case "map":
      result = runMap(input as Parameters<typeof runMap>[0]);
      break;
    case "save-observador":
      result = await runSaveObservador(input as Parameters<typeof runSaveObservador>[0]);
      break;
    case "save-again":
      result = await runSaveAgain(input as Parameters<typeof runSaveAgain>[0]);
      break;
    case "save-race":
      result = await runSaveRace(input as Parameters<typeof runSaveRace>[0]);
      break;
    case "save-same-title":
      result = await runSaveSameTitle(input as Parameters<typeof runSaveSameTitle>[0]);
      break;
    case "newspaper":
      result = await runNewspaper(input as Parameters<typeof runNewspaper>[0]);
      break;
    case "script":
      result = await runScript(input as Parameters<typeof runScript>[0]);
      break;
    case "produce":
      result = await runProduce(input as Parameters<typeof runProduce>[0]);
      break;
    default: {
      const unexpected: never = commandArg;
      throw new Error(`unexpected command ${String(unexpected)}`);
    }
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

void main();
