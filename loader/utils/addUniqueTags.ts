import { In } from "typeorm";
import { getRepositories } from "./getRepositories";
import { DeepPartial } from "../typings/deepPartial.type";
import { Article } from "../entities/article/article.entity";

export const addUniqueTags = async (article: DeepPartial<Article>): Promise<void> => {
  const { tagRepository } = await getRepositories();
  
  if (article.tags) {
    const existingTags = await tagRepository.find({ name: In(article.tags.map(tag => tag?.name)) });
    const filteredTags = article.tags.filter(tag => !existingTags.map(existingTag => existingTag.name).includes(tag?.name || ""));
    article.tags = [...existingTags, ...filteredTags];
  }
}
