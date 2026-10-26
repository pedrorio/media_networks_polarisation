import { messages, topics } from "../../../../constants";
import { KafkaMessage, Producer } from "kafkajs";
import { mergeCursor } from "../../../../utils/crawlCursor";

export const retrievedPageOldestArticleData = async (message: KafkaMessage, managerProducer: Producer): Promise<void> => {
  const { pageOldestArticle, pageNumber } = JSON.parse(message.value.toString());
  if (pageOldestArticle) {
    await mergeCursor("PUBLICO", { nextPage: pageNumber + 1 });
    await managerProducer.send({
      topic: topics.PUBLICO,
      messages: [
        { value: (pageNumber + 1).toString(), key: messages.PUBLICO.RETRIEVE_PAGE },
        { value: (pageNumber + 1).toString(), key: messages.PUBLICO.RETRIEVE_PAGE_OLDEST_ARTICLE },
      ],
    });
  } else {
    await mergeCursor("PUBLICO", { nextPage: null });
  }
};
