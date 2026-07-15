import { CreateDateColumn, UpdateDateColumn, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import { RequestContext } from './request-context';

export abstract class AuditableEntity {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @BeforeInsert()
  setCreatedAudit() {
    const userId = RequestContext.getUserId();
    if (userId) {
      this.createdBy = userId;
      this.updatedBy = userId;
    }
  }

  @BeforeUpdate()
  setUpdatedAudit() {
    const userId = RequestContext.getUserId();
    if (userId) {
      this.updatedBy = userId;
    }
  }
}
