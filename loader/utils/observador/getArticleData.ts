import axios from "axios";
import cheerio from "cheerio";

export const getArticleData = async (id: number) => {
  const apiResponse = await axios.get(`https://observador.pt/observador_api/req/3_0/items/id/${id}`);
  const article = apiResponse.data;
  article.body = cheerio.load(article.body)("p").text();
  return article;
};
