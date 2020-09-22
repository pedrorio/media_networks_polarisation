import { KafkaMessage } from "kafkajs";
import { Observador } from "../../../../utils/observador";
import { ArticleDTO } from "../../../../entities/article/article.dto";
import { getRepositories } from "../../../../utils";
import { addUniqueNewspaper } from "../../../../utils/addUniqueNewspaper";
import { addUniqueAuthors } from "../../../../utils/addUniqueAuthors";
import { addUniqueTags } from "../../../../utils/addUniqueTags";

export const filteredArticleData = async (message: KafkaMessage): Promise<void> => {
  const { articleRepository } = await getRepositories();
  
  const observadorArticle = ArticleDTO.toArticle(Observador.transformArticleBulk(JSON.parse(message.value.toString())));
  
  const existingArticle = await articleRepository.find({ title: observadorArticle.title });
  
  if (!existingArticle) {
    await addUniqueTags(observadorArticle);
    await addUniqueAuthors(observadorArticle);
    await addUniqueNewspaper(observadorArticle);
    
    await articleRepository.save(observadorArticle);
  }
};
