import {ObservadorArticle} from "../../typings/observador/article.type"
import {DeepPartial} from "../../typings/deepPartial.type"
import {newspapers} from "../../constants"
import { Article } from "../../entities/article/article.entity";


export const transformArticle = (observadorArticleData: ObservadorArticle): DeepPartial<Article> => {
	const {
		fullTitle,
		pubDate,
		metadata: {
			topics,
			authors
		},
		body
	} = observadorArticleData;
	
	return {
		title: fullTitle,
		date: new Date(pubDate),
		tags: topics.map(tag => ({name: tag.name})),
		text: body,
		authors: authors.filter(author => author.creditType.includes("text")).map(author => ({name: author.name})),
		newspaper: { name: newspapers.OBSERVADOR }
	};
}
