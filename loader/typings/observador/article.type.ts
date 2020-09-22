import { ObservadorTag } from "./tag.type";
import { ObservadorAuthor, ObservadorAuthorBulk } from "./author.type";

export interface ObservadorArticle {
  fullTitle: string;
  pubDate: string;
  metadata: {
    topics: ObservadorTag[];
    authors: ObservadorAuthor[];
  }
  body: string;
  
  [key: string]: any;
}


export interface ObservadorArticleBulk {
  title: string;
  
  date: {
    datetime: string;
  }
  
  textCredits: ObservadorAuthorBulk[];
  
  categories: ObservadorTag[]
  
  content: string;
  
  [key: string]: any;
}
