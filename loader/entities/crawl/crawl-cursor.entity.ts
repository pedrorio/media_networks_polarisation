import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class CrawlCursor {
  @PrimaryColumn()
  outlet!: string;

  @Column({ type: "int", nullable: true })
  nextPage!: number | null;

  @Column({ type: "simple-json", nullable: true })
  pendingBatches!: number[][] | null;

  @Column({ type: "simple-json", nullable: true })
  sentResults!: string[];
}
