import { BaseEntity, Column, Entity, Index, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Article } from "../article/article.entity";

@Entity()
export class Tag extends BaseEntity {
  @PrimaryGeneratedColumn() id!: number;
  
  @Index({ unique: true }) @Column() name!: string;
  
  @ManyToMany(() => Article) @JoinTable() articles?: Article[];
}
