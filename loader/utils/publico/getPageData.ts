import axios from "axios";
import { PublicoArticle } from "../../typings/publico/article.type";

export const getPageData = async (pageNumber: number): Promise<PublicoArticle[]> => {
  const apiResponse = await axios.get(`https://www.publico.pt/api/list/ultimas?page=${pageNumber}`);
  return apiResponse.data;
};
