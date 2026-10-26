import { messages, topics } from "../../constants";
import { Producer } from "kafkajs";
import { readCursor } from "../../utils/crawlCursor";
import { crawlFanout, enqueueCrawlWork } from "../../utils/crawlFanout";

export async function seedOrResume(producer: Producer): Promise<void> {
  const publico = await readCursor("PUBLICO");
  if (publico?.nextPage != null) {
    const page = String(publico.nextPage);
    await producer.send({
      topic: topics.PUBLICO,
      messages: [
        { value: page, key: messages.PUBLICO.RETRIEVE_PAGE },
        { value: page, key: messages.PUBLICO.RETRIEVE_PAGE_OLDEST_ARTICLE },
      ],
    });
  } else {
    await producer.send({
      topic: topics.PUBLICO,
      messages: [{ value: "1", key: messages.PUBLICO.RETRIEVE_PAGE_OLDEST_ARTICLE }],
    });
  }

  const observador = await readCursor("OBSERVADOR");
  if (observador?.pendingBatches && observador.pendingBatches.length > 0) {
    await enqueueCrawlWork(
      crawlFanout,
      "OBSERVADOR",
      topics.OBSERVADOR,
      observador.pendingBatches.map((batch) => ({
        value: JSON.stringify(batch),
        key: messages.OBSERVADOR.FILTER_ARTICLES,
      })),
      producer,
    );
    return;
  }

  await producer.send({
    topic: topics.OBSERVADOR,
    messages: [{ value: null, key: messages.OBSERVADOR.RETRIEVE_MOST_RECENT_ARTICLE }],
  });
}
