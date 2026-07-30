import {
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
  BeforeInsert,
  BeforeUpdate,
  BeforeRemove,
  BeforeSoftRemove,
} from 'typeorm';
import { RequestContext } from '../request-context';

export abstract class AuditableEntity {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy: string | null;

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
    if (this.deletedAt && !this.isDeleted) {
      this.isDeleted = true;
      if (userId) {
        this.deletedBy = userId;
      }
    }
  }

  @BeforeRemove()
  @BeforeSoftRemove()
  setDeletedAudit() {
    const userId = RequestContext.getUserId();
    this.isDeleted = true;
    this.deletedAt = new Date();
    if (userId) {
      this.deletedBy = userId;
    }
  }
}
