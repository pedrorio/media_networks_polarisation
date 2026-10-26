import { Publico } from "../../../../utils/publico";
import { messages, topics } from "../../../../constants";
import { KafkaMessage, Producer } from "kafkajs";

export const retrievePage = async (message: KafkaMessage, workerProducer: Producer): Promise<void> => {
  const pageData = await Publico.getPageData(parseInt(message.value.toString()));
  await workerProducer.send({
    topic: topics.PUBLICO,
    messages: [{
      value: JSON.stringify(pageData),
      key: messages.PUBLICO.RETRIEVED_PAGE_DATA
    }]
  });
};
