import { KafkaMessage } from "kafkajs";
import { Observador } from "../../../../utils/observador";
import { ArticleDTO } from "../../../../entities/article/article.dto";
import { saveNewArticle } from "../../../../utils/saveNewArticle";

export const filteredArticleData = async (message: KafkaMessage): Promise<void> => {
  const observadorArticle = ArticleDTO.toArticle(
    Observador.transformArticleBulk(JSON.parse(message.value.toString())),
  );
  await saveNewArticle(observadorArticle);
};
