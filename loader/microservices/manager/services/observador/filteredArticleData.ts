import { KafkaMessage, Producer } from "kafkajs";
import { Observador } from "../../../../utils/observador";
import { ArticleDTO } from "../../../../entities/article/article.dto";
import { completeCrawlWork, crawlFanout } from "../../../../utils/crawlFanout";
import { saveNewArticle } from "../../../../utils/saveNewArticle";

export const filteredArticleData = async (message: KafkaMessage, managerProducer: Producer): Promise<void> => {
  const observadorArticle = ArticleDTO.toArticle(
    Observador.transformArticleBulk(JSON.parse(message.value.toString())),
  );
  await saveNewArticle(observadorArticle);
  await completeCrawlWork(crawlFanout, "OBSERVADOR", managerProducer);
};
