import { messages, topics } from "../../../../constants";
import { KafkaMessage, Producer } from "kafkajs";

export const retrievedPageOldestArticleData = async (message: KafkaMessage, managerProducer: Producer): Promise<void> => {
  const { pageOldestArticle, pageNumber } = JSON.parse(message.value.toString());
  if (pageOldestArticle) {
    await managerProducer.send({
      topic: topics.PUBLICO,
      messages: [
        { value: (pageNumber + 1).toString(), key: messages.PUBLICO.RETRIEVE_PAGE },
        { value: (pageNumber + 1).toString(), key: messages.PUBLICO.RETRIEVE_PAGE_OLDEST_ARTICLE },
      ],
    });
  }
};
