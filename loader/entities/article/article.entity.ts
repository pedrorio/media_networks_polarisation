import {
  BaseEntity,
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn
} from "typeorm";
import { Tag } from "../tag/tag.entity";
import { Author } from "../author/author.entity";
import { Newspaper } from "../newspaper/newspaper.entity";
import { IsDate, IsString, IsUrl } from "class-validator";


@Entity()
export class Article extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;
  
  @Index({ unique: true }) @Column()
  @IsString()
  title!: string;
  
  @Column()
  @IsUrl()
  url!: string;
  
  @Column()
  @IsString()
  text!: string;
  
  @Column({ type: "date" })
  @IsDate()
  date!: Date;
  
  @ManyToMany(() => Tag) @JoinTable()
  tags?: Tag[];
  
  @ManyToMany(() => Author) @JoinTable()
  authors?: Author[];
  
  @OneToOne(() => Newspaper) @JoinColumn()
  newspaper!: Newspaper;
}
