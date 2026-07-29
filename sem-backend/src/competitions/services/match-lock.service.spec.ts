import { Test, TestingModule } from '@nestjs/testing';
import { MatchLockService } from './match-lock.service';

describe('MatchLockService', () => {
  let service: MatchLockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchLockService],
    }).compile();

    service = module.get<MatchLockService>(MatchLockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('acquireLock', () => {
    it('should successfully acquire a lock if not locked', () => {
      const res = service.acquireLock('match1', 'user1', 'User One');
      expect(res.success).toBe(true);
      expect(res.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should fail to acquire lock if already locked by another user and not expired', () => {
      service.acquireLock('match1', 'user1', 'User One');
      const res = service.acquireLock('match1', 'user2', 'User Two');
      expect(res.success).toBe(false);
      expect(res.lockedBy).toBe('User One');
    });

    it('should allow the same user to renew the lock', () => {
      const res1 = service.acquireLock('match1', 'user1', 'User One');
      const res2 = service.acquireLock('match1', 'user1', 'User One');
      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(res2.expiresAt).toBeGreaterThanOrEqual(res1.expiresAt!);
    });

    it('should allow another user to acquire the lock if it has expired', () => {
      jest.useFakeTimers();
      service.acquireLock('match1', 'user1', 'User One');
      
      // Fast-forward time by 61 seconds
      jest.advanceTimersByTime(61000);

      const res = service.acquireLock('match1', 'user2', 'User Two');
      expect(res.success).toBe(true);
      jest.useRealTimers();
    });
  });

  describe('releaseLock', () => {
    it('should release the lock if held by the same user', () => {
      service.acquireLock('match1', 'user1', 'User One');
      const released = service.releaseLock('match1', 'user1');
      expect(released).toBe(true);

      const check = service.isLocked('match1', 'user2');
      expect(check.locked).toBe(false);
    });

    it('should not release the lock if requested by another user', () => {
      service.acquireLock('match1', 'user1', 'User One');
      const released = service.releaseLock('match1', 'user2');
      expect(released).toBe(false);

      const check = service.isLocked('match1', 'user2');
      expect(check.locked).toBe(true);
    });
  });

  describe('isLocked', () => {
    it('should return false if match is not locked', () => {
      const check = service.isLocked('match1', 'user1');
      expect(check.locked).toBe(false);
    });

    it('should return false if match is locked by the same user', () => {
      service.acquireLock('match1', 'user1', 'User One');
      const check = service.isLocked('match1', 'user1');
      expect(check.locked).toBe(false);
    });

    it('should return true if match is locked by another user and not expired', () => {
      service.acquireLock('match1', 'user1', 'User One');
      const check = service.isLocked('match1', 'user2');
      expect(check.locked).toBe(true);
      expect(check.username).toBe('User One');
    });

    it('should return false if lock has expired', () => {
      jest.useFakeTimers();
      service.acquireLock('match1', 'user1', 'User One');
      jest.advanceTimersByTime(61000);
      const check = service.isLocked('match1', 'user2');
      expect(check.locked).toBe(false);
      jest.useRealTimers();
    });
  });

  describe('forceReleaseLock', () => {
    it('should remove the lock completely', () => {
      service.acquireLock('match1', 'user1', 'User One');
      service.forceReleaseLock('match1');
      const check = service.isLocked('match1', 'user2');
      expect(check.locked).toBe(false);
    });
  });
});
