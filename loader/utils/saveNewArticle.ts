import { addUniqueAuthors } from "./addUniqueAuthors";
import { addUniqueNewspaper } from "./addUniqueNewspaper";
import { addUniqueTags } from "./addUniqueTags";
import { getRepositories } from "./getRepositories";
import { Article } from "../entities/article/article.entity";
import { DeepPartial } from "../typings/deepPartial.type";

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const candidate = error as { code?: string; driverError?: { code?: string } };
  return candidate.code === "23505" || candidate.driverError?.code === "23505";
}

export const saveNewArticle = async (article: DeepPartial<Article>): Promise<void> => {
  const { articleRepository } = await getRepositories();
  const existing = await articleRepository.find({ sourceArticleId: article.sourceArticleId });
  const alreadyStored = existing.some(
    (row) =>
      row.sourceArticleId === article.sourceArticleId &&
      row.newspaper?.name === article.newspaper?.name,
  );
  if (alreadyStored) {
    return;
  }

  await addUniqueTags(article);
  await addUniqueAuthors(article);
  await addUniqueNewspaper(article);
  try {
    await articleRepository.save(article);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return;
    }
    throw error;
  }
};
