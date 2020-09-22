import { In } from "typeorm";
import { getRepositories } from "./getRepositories";
import { DeepPartial } from "../typings/deepPartial.type";
import { Article } from "../entities/article/article.entity";

export const addUniqueAuthors = async (article: DeepPartial<Article>): Promise<void> => {
  const { authorRepository } = await getRepositories();
  
  if (article.authors) {
    const existingAuthors = await authorRepository.find({ name: In(article.authors.map(author => author?.name)) });
    const filteredAuthors = article.authors.filter(author => !existingAuthors.map(existingAuthor => existingAuthor.name).includes(author?.name || ""));
    
    if (filteredAuthors) {
      article.authors = [...existingAuthors, ...filteredAuthors];
    }
  }
}
