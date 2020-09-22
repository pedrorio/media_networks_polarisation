import { messages, topics } from "../../../../constants";
import { KafkaMessage, Producer } from "kafkajs";
import { ObservadorArticleBulk } from "../../../../typings/observador/article.type";
import { Observador } from "../../../../utils/observador";

export const filterArticles = async (message: KafkaMessage, workerProducer: Producer): Promise<void> => {
  const batch = JSON.parse(message.value.toString())
  const filteredArticles = await Observador.getFilteredArticles(batch)
  await workerProducer.send({
    topic: topics.OBSERVADOR,
    messages: filteredArticles.map((article: ObservadorArticleBulk) => ({ value: JSON.stringify(article), key: messages.OBSERVADOR.FILTERED_ARTICLE_DATA }))
  });
};
