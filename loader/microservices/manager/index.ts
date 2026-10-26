import { messages, topics } from "../../constants";
import { Kafka } from "kafkajs";
import { publico } from "./services/publico/";
import { observador } from "./services/observador";
import { handleDelivery } from "../../utils/handleDelivery";
import { markConsumerJoined, startHeartbeat } from "../../utils/health";
import { seedOrResume } from "./seed";

export const kafka = new Kafka({
  clientId: "Scrapper",
  brokers: [`${process.env.KAFKA_HOST}:${process.env.KAFKA_PORT}`]
});

export const managerProducer = kafka.producer();
export const managerConsumer = kafka.consumer({ groupId: "manager-group" });

const run = async () => {
  startHeartbeat();
  managerConsumer.on(managerConsumer.events.GROUP_JOIN, () => {
    markConsumerJoined();
  });

  await managerProducer.connect();
  await seedOrResume(managerProducer);

  await managerConsumer.subscribe({ topic: topics.PUBLICO, fromBeginning: true });
  await managerConsumer.subscribe({ topic: topics.OBSERVADOR, fromBeginning: true });
  
  await managerConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      await handleDelivery(
        {
          topic,
          partition,
          offset: message.offset,
          key: message.key === null ? null : message.key.toString(),
          value: message.value === null ? null : message.value.toString(),
        },
        async () => {
          switch (message.key.toString()) {
            case messages.PUBLICO.RETRIEVED_PAGE_DATA:
              await publico.retrievedPageData(message, managerProducer);
              break;

            case messages.PUBLICO.RETRIEVED_ARTICLE_DATA:
              await publico.retrievedArticleData(message, managerProducer);
              break;

            case messages.PUBLICO.RETRIEVED_PAGE_OLDEST_ARTICLE_DATA:
              await publico.retrievedPageOldestArticleData(message, managerProducer);
              break;

            case messages.OBSERVADOR.RETRIEVED_MOST_RECENT_ARTICLE_DATA:
              await observador.retrievedMostRecentArticleData(message, managerProducer);
              break;

            case messages.OBSERVADOR.FILTERED_ARTICLE_DATA:
              await observador.filteredArticleData(message, managerProducer);
              break;

            default:
              break;
          }
        },
        managerProducer,
      );
    },
  });
  
};

run().catch(console.error);
