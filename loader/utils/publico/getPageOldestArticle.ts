import {getPageData} from "./getPageData"
import {PublicoArticle} from "../../typings/publico/article.type"

export const getPageOldestArticle = async (pageNumber: number): Promise<PublicoArticle> => {
	const pageArticles = await getPageData(pageNumber)
	const pageOldestArticleId = pageArticles.length == 0 ? 0 : Math.min(...pageArticles.map((article: any) => article.id));
	const pageOldestArticle = pageArticles.filter((article: PublicoArticle) => article.id == pageOldestArticleId)[0];
	return pageOldestArticle
}
