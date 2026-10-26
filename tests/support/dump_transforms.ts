import "reflect-metadata";
import * as fs from "fs";

import { Observador } from "../../loader/utils/observador";
import { Publico } from "../../loader/utils/publico";
import { range } from "../../loader/utils/range";

const commands = [
  "publico-transform",
  "observador-transform",
  "observador-bulk",
  "observador-batches",
  "range",
] as const;

type Command = (typeof commands)[number];

type PublicoInput = Parameters<typeof Publico.transformArticle>[0];
type ObservadorInput = Parameters<typeof Observador.transformArticle>[0];
type ObservadorBulkInput = Parameters<typeof Observador.transformArticleBulk>[0];

interface BatchInput {
  mostRecentArticleId: number;
  multiple: number;
}

function isCommand(value: string): value is Command {
  return (commands as readonly string[]).includes(value);
}

function stable(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => stable(item));
  }
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      const child = source[key];
      if (child !== undefined) {
        sorted[key] = stable(child);
      }
    }
    return sorted;
  }
  return value;
}

function transform(command: Command, input: unknown): unknown {
  switch (command) {
    case "publico-transform":
      return (input as PublicoInput[]).map((article) => Publico.transformArticle(article));
    case "observador-transform":
      return (input as ObservadorInput[]).map((article) => Observador.transformArticle(article));
    case "observador-bulk":
      return (input as ObservadorBulkInput[]).map((article) =>
        Observador.transformArticleBulk(article),
      );
    case "observador-batches":
      return (input as BatchInput[]).map((body) =>
        Observador.getArticleIdBatches(body.mostRecentArticleId, body.multiple),
      );
    case "range":
      return (input as [number, number][]).map(([start, end]) => range(start, end));
    default: {
      const unexpected: never = command;
      throw new Error(`unexpected command ${String(unexpected)}`);
    }
  }
}

function main(): void {
  const commandArg = process.argv[2];
  const inputPath = process.argv[3];
  if (!commandArg || !inputPath || !isCommand(commandArg)) {
    throw new Error(`usage: dump_transforms.ts <${commands.join("|")}> <input.json>`);
  }
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8")) as unknown;
  process.stdout.write(`${JSON.stringify(stable(transform(commandArg, input)), null, 2)}\n`);
}

main();
