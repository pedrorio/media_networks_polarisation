import { getRepositories, Observador } from "../utils";
import { Article } from "../entities/article/article.entity";
import { ArticleDTO } from "../entities/article/article.dto";
import { addUniqueTags } from "../utils/addUniqueTags";
import { addUniqueAuthors } from "../utils/addUniqueAuthors";
import { addUniqueNewspaper } from "../utils/addUniqueNewspaper";

export const getObservadorData = async (): Promise<void> => {
  const { connection, articleRepository } = await getRepositories();
  
  const mostRecentArticle = await Observador.getMostRecentArticle();
  const batches = Observador.getArticleIdBatches(mostRecentArticle.id, 1000);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    const articlesDataRetrieved = await Observador.getFilteredArticles(batch);
    const articles = articlesDataRetrieved.map(article => ArticleDTO.toArticle(Observador.transformArticleBulk(article)));
    
    for (const article of articles) {
      const existingArticles: Article[] = await articleRepository.find({ title: article.title });
      
      if (!existingArticles) {
        await addUniqueTags(article);
        await addUniqueAuthors(article);
        await addUniqueNewspaper(article);
        await articleRepository.save(article);
      }
    }
  }
  
  await connection.close();
};

getObservadorData();
