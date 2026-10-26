import { getRepositories } from "./getRepositories";

export interface CrawlCursorRow {
  outlet: string;
  nextPage: number | null;
  pendingBatches: number[][] | null;
  sentResults: string[];
}

interface CursorRepository {
  findOne: (query: { outlet: string }) => Promise<CrawlCursorRow | null>;
  save: (row: CrawlCursorRow) => Promise<CrawlCursorRow>;
}

function emptyCursor(outlet: string): CrawlCursorRow {
  return { outlet, nextPage: null, pendingBatches: null, sentResults: [] };
}

async function cursorRepository(): Promise<CursorRepository | undefined> {
  const repos = await getRepositories();
  return (repos as { cursorRepository?: CursorRepository }).cursorRepository;
}

export async function readCursor(outlet: string): Promise<CrawlCursorRow | null> {
  const repository = await cursorRepository();
  if (!repository) {
    return null;
  }
  return repository.findOne({ outlet });
}

export async function writeCursor(row: CrawlCursorRow): Promise<void> {
  const repository = await cursorRepository();
  if (!repository) {
    return;
  }
  const existing = await repository.findOne({ outlet: row.outlet });
  await repository.save({
    outlet: row.outlet,
    nextPage: row.nextPage,
    pendingBatches: row.pendingBatches,
    sentResults: row.sentResults ?? existing?.sentResults ?? [],
  });
}

export async function mergeCursor(outlet: string, patch: Partial<CrawlCursorRow>): Promise<void> {
  const existing = (await readCursor(outlet)) ?? emptyCursor(outlet);
  await writeCursor({
    outlet,
    nextPage: patch.nextPage !== undefined ? patch.nextPage : existing.nextPage,
    pendingBatches: patch.pendingBatches !== undefined ? patch.pendingBatches : existing.pendingBatches,
    sentResults: patch.sentResults !== undefined ? patch.sentResults : existing.sentResults,
  });
}

function outletFor(workIdentity: string): string {
  return workIdentity.startsWith("OBSERVADOR:") ? "OBSERVADOR" : "PUBLICO";
}

export async function hasResult(workIdentity: string): Promise<boolean> {
  const existing = await readCursor(outletFor(workIdentity));
  return existing?.sentResults.includes(workIdentity) ?? false;
}

export async function rememberResult(workIdentity: string): Promise<void> {
  const outlet = outletFor(workIdentity);
  const existing = (await readCursor(outlet)) ?? emptyCursor(outlet);
  if (existing.sentResults.includes(workIdentity)) {
    return;
  }
  existing.sentResults = [...existing.sentResults, workIdentity];
  await writeCursor(existing);
}
