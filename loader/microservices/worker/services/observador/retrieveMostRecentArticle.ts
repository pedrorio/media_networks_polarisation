import { messages, topics } from "../../../../constants";
import { KafkaMessage, Producer } from "kafkajs";
import { ObservadorArticle } from "../../../../typings/observador/article.type";
import { Observador } from "../../../../utils/observador";

export const retrieveMostRecentArticle = async (message: KafkaMessage, workerProducer: Producer): Promise<void> => {
  const mostRecentArticle: ObservadorArticle = await Observador.getMostRecentArticle();
  await workerProducer.send({
    topic: topics.OBSERVADOR,
    messages: [{ value: JSON.stringify(mostRecentArticle), key: messages.OBSERVADOR.RETRIEVED_MOST_RECENT_ARTICLE_DATA }]
  });
};
