import { getArticleData } from "./getArticleData";
import { getPageData } from "./getPageData";
import { getMostRecentArticleId } from "./getMostRecentArticleId";
import { getPageOldestArticle } from "./getPageOldestArticle";
import { transformArticle } from "./transformArticle";

export const publico = {
	getArticleData,
	getPageData,
	getMostRecentArticleId,
	getPageOldestArticle,
	transformArticle
};

export class Publico {
	static getArticleData = getArticleData;
	static getPageData = getPageData;
	static getMostRecentArticleId = getMostRecentArticleId;
	static getPageOldestArticle = getPageOldestArticle;
	static transformArticle = transformArticle;
}