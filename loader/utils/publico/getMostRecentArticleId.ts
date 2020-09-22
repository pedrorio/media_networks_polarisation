import { getPageData } from "./getPageData";

export const getMostRecentArticleId = async (): Promise<number> => {
  const pageArticles = await getPageData(1);
  const mostRecentArticleId = Math.max(...pageArticles.map((article: any) => article.id));
  return mostRecentArticleId;
};
