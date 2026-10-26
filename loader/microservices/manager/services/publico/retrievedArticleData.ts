import { Publico } from "../../../../utils/publico";
import { KafkaMessage, Producer } from "kafkajs";
import { ArticleDTO } from "../../../../entities/article/article.dto";
import { completeCrawlWork, crawlFanout } from "../../../../utils/crawlFanout";
import { saveNewArticle } from "../../../../utils/saveNewArticle";

export const retrievedArticleData = async (message: KafkaMessage, managerProducer: Producer): Promise<void> => {
  const article = ArticleDTO.toArticle(Publico.transformArticle(JSON.parse(message.value.toString())));
  await saveNewArticle(article, `PUBLICO:article:${article.sourceArticleId ?? ""}`);
  await completeCrawlWork(crawlFanout, "PUBLICO", managerProducer);
};
