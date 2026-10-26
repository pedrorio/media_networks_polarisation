import { isConsumerLive, isConsumerReady, markConsumerJoined, startHeartbeat } from "../../loader/utils/health";

function main(): void {
  const readyBefore = isConsumerReady();
  const liveBefore = isConsumerLive();
  markConsumerJoined();
  startHeartbeat();
  const result = {
    readyBefore,
    readyAfter: isConsumerReady(),
    liveBefore,
    liveAfter: isConsumerLive(),
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main();
