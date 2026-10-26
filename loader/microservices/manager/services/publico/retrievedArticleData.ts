import { Publico } from "../../../../utils/publico";
import { KafkaMessage } from "kafkajs";
import { ArticleDTO } from "../../../../entities/article/article.dto";
import { saveNewArticle } from "../../../../utils/saveNewArticle";

export const retrievedArticleData = async (message: KafkaMessage): Promise<void> => {
  const article = ArticleDTO.toArticle(Publico.transformArticle(JSON.parse(message.value.toString())));
  await saveNewArticle(article);
};
