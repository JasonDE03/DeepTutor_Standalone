import redis
import os
from typing import Optional

class FileLockManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.lock_ttl = 60  # 60 seconds

    def acquire_lock(self, file_path: str, user_id: str) -> bool:
        """Try to acquire lock for file"""
        lock_key = f"file_lock:{file_path}"
        # SET NX EX: Set if Not eXists with EXpiry
        return bool(self.redis.set(lock_key, user_id, nx=True, ex=self.lock_ttl))

    def release_lock(self, file_path: str, user_id: str) -> bool:
        """Release lock if owned by user (using Lua script for atomicity)"""
        lock_key = f"file_lock:{file_path}"
        # Lua script to prevent race condition: only delete if value matches user_id
        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        result = self.redis.eval(lua_script, 1, lock_key, user_id)
        return result == 1

    def extend_lock(self, file_path: str, user_id: str, ttl: int = 60) -> bool:
        """Extend lock TTL (heartbeat mechanism)"""
        lock_key = f"file_lock:{file_path}"
        # Lua script to extend only if owned by user
        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("expire", KEYS[1], ARGV[2])
        else
            return 0
        end
        """
        result = self.redis.eval(lua_script, 1, lock_key, user_id, ttl)
        return result == 1

    def get_lock_owner(self, file_path: str) -> Optional[str]:
        """Check who owns the lock"""
        lock_key = f"file_lock:{file_path}"
        owner = self.redis.get(lock_key)
        return owner.decode() if owner else None
