import { BaseEntity, Column, Entity, Index, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Article } from "../article/article.entity";
import { IsString } from "class-validator";

@Entity()
export class Author extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;
  
    @Index({ unique: true }) @Column()
    @IsString()
    name!: string;

    @ManyToMany(() => Article) @JoinTable()
    articles?: Article[];
}
