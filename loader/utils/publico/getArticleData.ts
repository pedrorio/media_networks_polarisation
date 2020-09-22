import axios from "axios";
import cheerio from "cheerio";

export const getArticleData = async (article: any) => {
  const textResponse = await axios.get(`https://www.publico.pt${article.url}`);
  article.texto = cheerio.load(textResponse.data)("div.story__body > p").text();
  return article;
};
