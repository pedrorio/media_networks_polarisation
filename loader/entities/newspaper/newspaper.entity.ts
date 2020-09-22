import { BaseEntity, Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Article } from "../article/article.entity";
import { newspapers } from "../../constants";
import { IsString, IsUrl } from "class-validator";

@Entity()
export class Newspaper extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;
  
  @Index({ unique: true }) @Column()
  @IsString()
  name!: keyof newspapers;
  
  @Column()
  @IsUrl()
  url?: string;
  
  @ManyToOne(type => Article, article => article.newspaper)
  articles?: Article[];
}
