import { Publico } from "../../../../utils/publico";
import { messages, topics } from "../../../../constants";
import { KafkaMessage, Producer } from "kafkajs";

export const retrievePageOldestArticle = async (message: KafkaMessage, workerProducer: Producer): Promise<void> => {
  const pageNumber = parseInt(message.value.toString())
  const pageOldestArticle = await Publico.getPageOldestArticle(pageNumber);
  
  await workerProducer.send({
    topic: topics.PUBLICO,
    messages: [{ value: JSON.stringify({pageOldestArticle, pageNumber}), key: messages.PUBLICO.RETRIEVED_PAGE_OLDEST_ARTICLE_DATA }]
  });
};
