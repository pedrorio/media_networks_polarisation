import { Article } from "../article/article.entity";
import { Tag } from "./tag.entity";
import { plainToClass } from "class-transformer";

export class TagDTO {
  
  articles!: Article[];
  name!: string;

  static toTag(tagDto: TagDTO) {
    return plainToClass(Tag, tagDto, { excludeExtraneousValues: true });
  }
}
