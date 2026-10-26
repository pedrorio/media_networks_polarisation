import { Publico } from "../../../../utils/publico";
import { messages, topics } from "../../../../constants";
import { KafkaMessage, Producer } from "kafkajs";
import { sendResultOnce } from "../../../../utils/sendResultOnce";

export const retrievePage = async (message: KafkaMessage, workerProducer: Producer): Promise<void> => {
  const pageNumber = parseInt(message.value.toString());
  const pageData = await Publico.getPageData(pageNumber);
  await sendResultOnce(workerProducer, {
    topic: topics.PUBLICO,
    key: messages.PUBLICO.RETRIEVED_PAGE_DATA,
    value: JSON.stringify(pageData),
    workIdentity: `PUBLICO:page:${pageNumber}`,
  });
};
