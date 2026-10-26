import { Publico } from "../../../../utils/publico";
import { messages, newspapers, topics } from "../../../../constants";
import { KafkaMessage, Producer } from "kafkajs";

export const retrieveArticle = async (message: KafkaMessage, workerProducer: Producer): Promise<void> => {
  const publicoArticle = await Publico.getArticleData(JSON.parse(message.value.toString()));
  const produced = {
    ...publicoArticle,
    sourceArticleId: publicoArticle.sourceArticleId ?? publicoArticle.id,
    outlet: newspapers.PUBLICO,
  };
  await workerProducer.send({
    topic: topics.PUBLICO,
    messages: [{ value: JSON.stringify(produced), key: messages.PUBLICO.RETRIEVED_ARTICLE_DATA }]
  });
};
