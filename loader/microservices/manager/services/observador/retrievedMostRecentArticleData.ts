import { messages, topics } from "../../../../constants";
import { KafkaMessage, Producer } from "kafkajs";
import { mergeCursor } from "../../../../utils/crawlCursor";
import { crawlFanout, enqueueCrawlWork } from "../../../../utils/crawlFanout";
import { Observador } from "../../../../utils/observador";

export const retrievedMostRecentArticleData = async (message: KafkaMessage, managerProducer: Producer): Promise<void> => {
  const mostRecentArticleData = JSON.parse(message.value.toString());
  const batches = Observador.getArticleIdBatches(mostRecentArticleData.id, 1000);
  await mergeCursor("OBSERVADOR", { pendingBatches: batches });

  await enqueueCrawlWork(
    crawlFanout,
    "OBSERVADOR",
    topics.OBSERVADOR,
    batches.map((batch) => ({ value: JSON.stringify(batch), key: messages.OBSERVADOR.FILTER_ARTICLES })),
    managerProducer,
  );
};
