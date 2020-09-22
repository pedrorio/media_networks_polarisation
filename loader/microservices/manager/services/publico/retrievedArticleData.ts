import { Publico } from "../../../../utils/publico";
import { KafkaMessage } from "kafkajs";
import { ArticleDTO } from "../../../../entities/article/article.dto";
import { getRepositories } from "../../../../utils";
import { addUniqueTags } from "../../../../utils/addUniqueTags";
import { addUniqueAuthors } from "../../../../utils/addUniqueAuthors";
import { addUniqueNewspaper } from "../../../../utils/addUniqueNewspaper";

export const retrievedArticleData = async (message: KafkaMessage): Promise<void> => {
  const { articleRepository} = await getRepositories();
  
  const article = ArticleDTO.toArticle(Publico.transformArticle(JSON.parse(message.value.toString())));
  
  await addUniqueTags(article);
  await addUniqueAuthors(article);
  await addUniqueNewspaper(article);
  await articleRepository.save(article);
};
