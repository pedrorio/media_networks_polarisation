import { messages, topics } from "../../../../constants";
import { KafkaMessage, Producer } from "kafkajs";
import { Observador } from "../../../../utils/observador";

export const retrievedMostRecentArticleData = async (message: KafkaMessage, managerProducer: Producer): Promise<void> => {
  const mostRecentArticleData = JSON.parse(message.value.toString());
  const batches = Observador.getArticleIdBatches(mostRecentArticleData.id, 1000);
  
  await managerProducer.send({
    topic: topics.OBSERVADOR,
    messages: batches.map(batch => ({ value: JSON.stringify(batch), key: messages.OBSERVADOR.FILTER_ARTICLES }))
  });
};
