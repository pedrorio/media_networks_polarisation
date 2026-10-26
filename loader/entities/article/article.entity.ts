import { Expose, Type } from "class-transformer";
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Tag } from "../tag/tag.entity";
import { Author } from "../author/author.entity";
import { Newspaper } from "../newspaper/newspaper.entity";
import { IsDate, IsString, IsUrl } from "class-validator";


@Entity()
@Unique(["newspaper", "sourceArticleId"])
export class Article extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Expose()
  @IsString()
  title!: string;

  @Column({ nullable: true })
  @Expose()
  sourceArticleId?: number;

  @Column()
  @IsUrl()
  url!: string;

  @Column()
  @Expose()
  @IsString()
  text!: string;

  @Column({ type: "date" })
  @Expose()
  @IsDate()
  date!: Date;

  @ManyToMany(() => Tag) @JoinTable()
  @Expose()
  @Type(() => Tag)
  tags?: Tag[];

  @ManyToMany(() => Author) @JoinTable()
  @Expose()
  @Type(() => Author)
  authors?: Author[];

  @OneToOne(() => Newspaper) @JoinColumn()
  @Expose()
  @Type(() => Newspaper)
  newspaper!: Newspaper;
}
