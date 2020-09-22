import { createConnection, getRepository, Repository } from "typeorm";
import {Tag} from "../entities/tag/tag.entity"
import {Article} from "../entities/article/article.entity"
import {Author} from "../entities/author/author.entity"
import {Newspaper} from "../entities/newspaper/newspaper.entity"

export const getRepositories = async () => {
	const connection = await createConnection();

	const articleRepository: Repository<Article> = connection.getRepository(Article);
	const tagRepository: Repository<Tag> = connection.getRepository(Tag);
	const authorRepository: Repository<Author> = connection.getRepository(Author);
	const newspaperRepository: Repository<Newspaper> = connection.getRepository(Newspaper);

	return {connection, articleRepository, tagRepository, authorRepository, newspaperRepository};
}
