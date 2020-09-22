import { IsDate, IsString, IsUrl, ValidateNested } from "class-validator";
import { plainToClass, Type } from "class-transformer";
import { Tag } from "../tag/tag.entity";
import { Author } from "../author/author.entity";
import { Article } from "./article.entity";
import { Newspaper } from "../newspaper/newspaper.entity";
import { DeepPartial } from "../../typings/deepPartial.type";

export class ArticleDTO {
  
  @Type(() => Tag) @ValidateNested()
  tags?: Tag[];
  
  @Type(() => Author) @ValidateNested()
  authors?: Author[];
  
  @Type(() => Newspaper) @ValidateNested()
  newspaper?: Newspaper;
  
  @IsString()
  title!: string;
  
  @IsUrl()
  url!: string;
  @IsString()
  text!: string;
  
  @IsDate()
  date!: Date;
  
  static toArticle(articleDto: DeepPartial<ArticleDTO>): DeepPartial<Article> {
    return plainToClass(Article, articleDto, { excludeExtraneousValues: true });
  }
}
