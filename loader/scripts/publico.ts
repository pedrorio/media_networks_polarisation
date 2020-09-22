import { getRepositories, Publico } from "../utils";
import { PublicoArticle } from "../typings/publico/article.type";
import { In } from "typeorm";
import { ArticleDTO } from "../entities/article/article.dto";
import { DeepPartial } from "../typings/deepPartial.type";
import { Article } from "../entities/article/article.entity";
import { addUniqueTags } from "../utils/addUniqueTags";
import { addUniqueAuthors } from "../utils/addUniqueAuthors";
import { addUniqueNewspaper } from "../utils/addUniqueNewspaper";

export const getPublicoData = async () => {
  const { connection, articleRepository } = await getRepositories();
  
  let pageNumber = 1;
  let pageOldestArticle: PublicoArticle = await Publico.getPageOldestArticle(pageNumber);
  
  while (pageOldestArticle) {
    const pageData: PublicoArticle[] = await Publico.getPageData(pageNumber);
    
    const articlesToRetrieve: DeepPartial<Article[]> = pageData.map(article => ArticleDTO.toArticle(Publico.transformArticle(article)));
    const existingArticles = await articleRepository.find({ title: In(articlesToRetrieve.map(article => article?.title)) });
    const filteredArticles = articlesToRetrieve.filter(article => !existingArticles.map(existingArticle => existingArticle.title).includes(article?.title || ""));
    
    for (const filteredArticle of filteredArticles) {
      const articleData = await Publico.getArticleData(filteredArticle?.id);
      const article = ArticleDTO.toArticle(Publico.transformArticle(articleData));
      
      await addUniqueTags(article);
      await addUniqueAuthors(article);
      await addUniqueNewspaper(article);
      await articleRepository.save(article);
    }
    
    pageOldestArticle = await Publico.getPageOldestArticle(pageNumber);
    pageNumber++;
  }
  
  await connection.close();
};

getPublicoData();
