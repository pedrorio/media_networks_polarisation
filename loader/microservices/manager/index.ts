import { messages, topics } from "../../constants";
import { Kafka } from "kafkajs";
import { publico } from "./services/publico/";
import { observador } from "./services/observador";

export const kafka = new Kafka({
  clientId: "Scrapper",
  brokers: [`${process.env.KAFKA_HOST}:${process.env.KAFKA_PORT}`]
});

export const managerProducer = kafka.producer();
export const managerConsumer = kafka.consumer({ groupId: "manager-group" });

const run = async () => {
  
  await managerProducer.connect();
  
  await managerProducer.send({
    topic: topics.PUBLICO,
    messages: [
      { value: (1).toString(), key: messages.PUBLICO.RETRIEVE_PAGE_OLDEST_ARTICLE },
    ],
  });
  
  await managerProducer.send({
    topic: topics.OBSERVADOR,
    messages: [
      { value: null, key: messages.OBSERVADOR.RETRIEVE_MOST_RECENT_ARTICLE },
    ],
  });
  
  await managerConsumer.subscribe({ topic: topics.PUBLICO, fromBeginning: true });
  await managerConsumer.subscribe({ topic: topics.OBSERVADOR, fromBeginning: true });
  
  await managerConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      switch (message.key.toString()) {
        
        case messages.PUBLICO.RETRIEVED_PAGE_DATA:
          await publico.retrievedPageData(message, managerProducer);
          break;
        
        case messages.PUBLICO.RETRIEVED_ARTICLE_DATA:
          await publico.retrievedArticleData(message);
          break;
        
        case messages.PUBLICO.RETRIEVED_PAGE_OLDEST_ARTICLE_DATA:
          await publico.retrievedPageOldestArticleData(message, managerProducer);
          break;
        
        case messages.OBSERVADOR.RETRIEVED_MOST_RECENT_ARTICLE_DATA:
          await observador.retrievedMostRecentArticleData(message, managerProducer);
          break;
        
        case messages.OBSERVADOR.FILTERED_ARTICLE_DATA:
          await observador.filteredArticleData(message)
          break;
        
        default:
          break;
      }
    },
  });
  
};

run().catch(console.error);
