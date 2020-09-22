import { Publico } from "../../../../utils/publico";
import { messages, topics } from "../../../../constants";
import { KafkaMessage, Producer } from "kafkajs";
import { ArticleDTO } from "../../../../entities/article/article.dto";
import { In } from "typeorm";
import { Article } from "../../../../entities/article/article.entity";
import { getRepositories } from "../../../../utils";
import { PublicoArticle } from "../../../../typings/publico/article.type";
import { DeepPartial } from "../../../../typings/deepPartial.type";

export const retrievedPageData = async (message: KafkaMessage, managerProducer: Producer): Promise<void> => {
  const { articleRepository } = await getRepositories();
  
  const pageData: PublicoArticle[] = JSON.parse(message.value.toString());
  
  const articlesToRetrieve: DeepPartial<Article[]> = pageData.map(article => ArticleDTO.toArticle(Publico.transformArticle(article)));
  const existingArticles = await articleRepository.find({ title: In(articlesToRetrieve.map(article => article?.title)) });
  const filteredArticles = articlesToRetrieve.filter(article => !existingArticles.map(existingArticle => existingArticle.title).includes(article?.title || ""));
  
  await managerProducer.send({
    topic: topics.PUBLICO,
    messages: filteredArticles.map(article => ({
      value: JSON.stringify(article),
      key: messages.PUBLICO.RETRIEVE_ARTICLE
    }))
  });
};
