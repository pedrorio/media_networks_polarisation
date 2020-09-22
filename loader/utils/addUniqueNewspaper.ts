import { getRepositories } from "./getRepositories";
import { DeepPartial } from "../typings/deepPartial.type";
import { Article } from "../entities/article/article.entity";
import { newspapers } from "../constants";

export const addUniqueNewspaper = async (article: DeepPartial<Article>): Promise<void> => {
  const { newspaperRepository } = await getRepositories();
  
  const existingNewspaper = await newspaperRepository.findOne({ name: newspapers.OBSERVADOR });
  if (!existingNewspaper) {
    await newspaperRepository.save(article);
  } else {
    article.newspaper = existingNewspaper;
  }
}
