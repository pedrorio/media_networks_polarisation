import * as fs from "fs";
import * as path from "path";

function readyFile(): string {
  return process.env.CONSUMER_READY_FILE ?? "/tmp/consumer-ready";
}

function liveFile(): string {
  return process.env.CONSUMER_LIVE_FILE ?? "/tmp/consumer-live";
}

function writeMarker(file: string, contents: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

export function markConsumerJoined(): void {
  writeMarker(readyFile(), "ready\n");
}

export function isConsumerReady(): boolean {
  return fs.existsSync(readyFile());
}

export function startHeartbeat(): void {
  const beat = (): void => {
    writeMarker(liveFile(), `${Date.now()}\n`);
  };
  beat();
  const timer = setInterval(beat, 1000);
  timer.unref();
}

export function isConsumerLive(maxAgeMs = 60000): boolean {
  const file = liveFile();
  if (!fs.existsSync(file)) {
    return false;
  }
  return Date.now() - fs.statSync(file).mtimeMs <= maxAgeMs;
}
