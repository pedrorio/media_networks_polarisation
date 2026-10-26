import {  messages, topics } from "../../constants";
import { Kafka } from "kafkajs";
import { publico } from "./services/publico";
import { observador } from "./services/observador";
import { handleDelivery } from "../../utils/handleDelivery";
import { markConsumerJoined, startHeartbeat } from "../../utils/health";

export const kafka = new Kafka({
  clientId: "Scrapper",
  brokers: [`${process.env.KAFKA_HOST}:${process.env.KAFKA_PORT}`]
});

export const workerProducer = kafka.producer();
export const workerConsumer = kafka.consumer({ groupId: "worker-group" });

const run = async () => {
  startHeartbeat();
  workerConsumer.on(workerConsumer.events.GROUP_JOIN, () => {
    markConsumerJoined();
  });

  await workerProducer.connect();
  await workerConsumer.connect();
  await workerConsumer.subscribe({ topic: topics.PUBLICO, fromBeginning: true });
  await workerConsumer.subscribe({ topic: topics.OBSERVADOR, fromBeginning: true });
  
  await workerConsumer.run({
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
            case messages.PUBLICO.RETRIEVE_PAGE:
              await publico.retrievePage(message, workerProducer);
              break;

            case messages.PUBLICO.RETRIEVE_ARTICLE:
              await publico.retrieveArticle(message, workerProducer);
              break;

            case messages.PUBLICO.RETRIEVE_PAGE_OLDEST_ARTICLE:
              await publico.retrievePageOldestArticle(message, workerProducer);
              break;

            case messages.OBSERVADOR.RETRIEVE_MOST_RECENT_ARTICLE:
              await observador.retrieveMostRecentArticle(message, workerProducer);
              break;

            case messages.OBSERVADOR.FILTER_ARTICLES:
              await observador.filterArticles(message, workerProducer);
              break;

            default:
              break;
          }
        },
        workerProducer,
      );
    },
  });

};

run().catch(console.error);
