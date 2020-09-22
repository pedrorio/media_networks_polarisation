import { getArticleData } from "./getArticleData";
import { getMostRecentArticle } from "./getMostRecentArticle";
import { filterArticles, getFilteredArticles, getArticleIdBatches, divideArticleIdsInBatches } from "./filterArticles";
import { transformArticleBulk } from "./transformArticleBulk";
import { transformArticle } from "./transformArticle";

export class Observador {
	static getArticleData = getArticleData;
	static getMostRecentArticle = getMostRecentArticle;
	static getArticleIdBatches = getArticleIdBatches;
	static divideArticleIdsInBatches = divideArticleIdsInBatches;
	static getFilteredArticles = getFilteredArticles;
	static filterArticles = filterArticles;
	static transformArticleBulk = transformArticleBulk;
	static transformArticle = transformArticle;
}
