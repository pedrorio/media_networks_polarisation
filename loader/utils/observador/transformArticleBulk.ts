import { ObservadorArticleBulk } from "../../typings/observador/article.type";
import { DeepPartial } from "../../typings/deepPartial.type";
import { newspapers } from "../../constants";
import { ArticleDTO } from "../../entities/article/article.dto";

export const transformArticleBulk = (observadorArticleData: ObservadorArticleBulk): DeepPartial<ArticleDTO> => {
  const {
    title,
    date: { datetime },
    categories,
    textCredits,
    content
  } = observadorArticleData;
  
  
  return {
    title,
    date: new Date(datetime),
    tags: categories.map(tag => ({ name: tag.name })),
    text: content,
    authors: textCredits.map(textCredit => ({ name: textCredit.user.displayName })),
    newspaper: { name: newspapers.OBSERVADOR }
  };
};
