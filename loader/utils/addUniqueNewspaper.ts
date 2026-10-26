import { getRepositories } from "./getRepositories";
import { DeepPartial } from "../typings/deepPartial.type";
import { Article } from "../entities/article/article.entity";

export const addUniqueNewspaper = async (article: DeepPartial<Article>): Promise<void> => {
  const { newspaperRepository } = await getRepositories();
  const name = article.newspaper?.name;
  if (!name) {
    throw new Error("article is missing a newspaper name");
  }

  const existingNewspaper = await newspaperRepository.findOne({ name });
  if (!existingNewspaper) {
    article.newspaper = await newspaperRepository.save({ name });
  } else {
    article.newspaper = existingNewspaper;
  }
};
