import { Publico } from "../../../../utils/publico";
import { messages, topics } from "../../../../constants";
import { KafkaMessage, Producer } from "kafkajs";

export const retrieveArticle = async (message: KafkaMessage, workerProducer: Producer): Promise<void> => {
  const publicoArticle = await Publico.getArticleData(parseInt(message.value.toString()));
  await workerProducer.send({
    topic: topics.PUBLICO,
    messages: [{ value: JSON.stringify(publicoArticle), key: messages.PUBLICO.RETRIEVED_ARTICLE_DATA }]
  });
};
