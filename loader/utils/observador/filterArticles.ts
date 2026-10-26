import axios from "axios";
import {ObservadorArticleBulk, ObservadorArticle} from "../../typings/observador/article.type"

export const divideArticleIdsInBatches = (batchNumber: number, multiple: number, allPossibleArticleIds: number[]) => allPossibleArticleIds.slice(
        allPossibleArticleIds.length / multiple * (batchNumber - 1),
        allPossibleArticleIds.length / multiple * batchNumber
);

export const getArticleIdBatches = (mostRecentArticleId: number, multiple: number): number[][] => {
    if (mostRecentArticleId < 1 || multiple < 1) {
        return [];
    }
    const batches: number[][] = [];
    for (let start = 1; start <= mostRecentArticleId; start += multiple) {
        const end = Math.min(start + multiple - 1, mostRecentArticleId);
        const batch: number[] = [];
        for (let id = start; id <= end; id += 1) {
            batch.push(id);
        }
        batches.push(batch);
    }
    return batches;
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
