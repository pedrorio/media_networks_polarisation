import { PublicoArticle } from "../../typings/publico/article.type";
import { DeepPartial } from "../../typings/deepPartial.type";
import { newspapers } from "../../constants";
import { ArticleDTO } from "../../entities/article/article.dto";

export const transformArticle = (publicoArticleData: PublicoArticle): DeepPartial<ArticleDTO> => {
  const {
    titulo,
    data,
    tags,
    autores,
    texto
  } = publicoArticleData;
  
  return {
    title: titulo,
    date: new Date(data),
    tags: tags.map(tag => ({ name: tag.name })),
    text: texto as string,
    authors: autores.filter(author => {
      return (
        author.contribuicao == "Texto" ||
        author.contribuicao == "Textos" ||
        author.contribuicao == "texto" ||
        author.contribuicao == "textos"
      );
    }).map(author => ({ name: author.nome })),
    newspaper: { name: newspapers.PUBLICO }
    
  };
};
