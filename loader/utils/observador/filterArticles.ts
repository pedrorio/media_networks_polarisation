import axios from "axios";
import {ObservadorArticleBulk, ObservadorArticle} from "../../typings/observador/article.type"
import { range } from "../range";

export const divideArticleIdsInBatches = (batchNumber: number, multiple: number, allPossibleArticleIds: number[]) => allPossibleArticleIds.slice(
        allPossibleArticleIds.length / multiple * (batchNumber - 1),
        allPossibleArticleIds.length / multiple * batchNumber
);

export const getArticleIdBatches = (mostRecentArticleId: number, multiple: number): number[][] => {
    const divisor = Math.ceil(mostRecentArticleId / multiple) + 1;
    const allPossibleArticleIds: number[] = range(1, mostRecentArticleId);
    return range(1, divisor).map(batchNumber => divideArticleIdsInBatches(batchNumber, multiple, allPossibleArticleIds))
}

export const getFilteredArticles = async (batch: number[]): Promise<ObservadorArticleBulk[]> => {
  const response = await axios.post(
        "https://observador.pt/wp-json/obs_api/v4/news/fetchbulk",
        batch
   );
  return response.data;
}

export const filterArticles = async (mostRecentArticleId: number, multiple: number) => {

  const batches = getArticleIdBatches(mostRecentArticleId, multiple)

  const existingArticles: ObservadorArticleBulk[] = [];
  
  for (const batch of batches) {
      const filteredArticles = await getFilteredArticles(batch);
      existingArticles.concat(filteredArticles)
  }

  return existingArticles;
}
