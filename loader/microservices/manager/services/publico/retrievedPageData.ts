import { Publico } from "../../../../utils/publico";
import { messages, topics } from "../../../../constants";
import { KafkaMessage, Producer } from "kafkajs";
import { In } from "typeorm";
import { getRepositories } from "../../../../utils";
import { crawlFanout, enqueueCrawlWork } from "../../../../utils/crawlFanout";
import { PublicoArticle } from "../../../../typings/publico/article.type";

export const retrievedPageData = async (message: KafkaMessage, managerProducer: Producer): Promise<void> => {
  const { articleRepository } = await getRepositories();

  const pageData: PublicoArticle[] = JSON.parse(message.value.toString());
  const articlesToRetrieve = pageData.map((article) => ({
    article,
    title: Publico.transformArticle(article).title,
  }));
  const existingArticles = await articleRepository.find({
    title: In(articlesToRetrieve.map((item) => item.title)),
  });
  const existingTitles = existingArticles.map((existingArticle) => existingArticle.title);
  const filteredArticles = articlesToRetrieve.filter(
    (item) => !existingTitles.includes(item.title || ""),
  );

  await enqueueCrawlWork(
    crawlFanout,
    "PUBLICO",
    topics.PUBLICO,
    filteredArticles.map((item) => ({
      value: JSON.stringify(item.article),
      key: messages.PUBLICO.RETRIEVE_ARTICLE,
    })),
    managerProducer,
  );
};
