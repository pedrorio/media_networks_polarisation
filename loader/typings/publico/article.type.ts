import { PublicoTag } from "./tag.type";
import { PublicoAuthor } from "./author.type";

export interface PublicoArticle {
  titulo: string;
  data: string;
  
  tags: PublicoTag[];
  autores: PublicoAuthor[];
  texto: null | string;
  
  [key: string]: any;
}
