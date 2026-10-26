import { getRepositories, Observador } from "../utils";
import { ArticleDTO } from "../entities/article/article.dto";
import { saveNewArticle } from "../utils/saveNewArticle";

export const getObservadorData = async (): Promise<void> => {
  const { connection } = await getRepositories();
  
  const mostRecentArticle = await Observador.getMostRecentArticle();
  const batches = Observador.getArticleIdBatches(mostRecentArticle.id, 1000);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    const articlesDataRetrieved = await Observador.getFilteredArticles(batch);
    const articles = articlesDataRetrieved.map(article => ArticleDTO.toArticle(Observador.transformArticleBulk(article)));
    
    for (const article of articles) {
      await saveNewArticle(article);
    }
  }
  
  await connection.close();
};

if (require.main === module) {
  void getObservadorData();
}
