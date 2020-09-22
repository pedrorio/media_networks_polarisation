import axios from "axios";
import { ObservadorArticle } from "../../typings/observador/article.type";

export const getMostRecentArticle = async (): Promise<ObservadorArticle> => {
  const apiResponse = await axios.get("https://observador.pt/wp-json/obs_api/v4/news/widget");
  const mostRecentArticleId = Math.max(...apiResponse.data.map((article: any) => article.id));
  const mostRecentArticle = apiResponse.data.filter((article: ObservadorArticle) => article.id == mostRecentArticleId)[0];
  return mostRecentArticle;
};
