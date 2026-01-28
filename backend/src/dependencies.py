from typing import Generator
import os
import redis
from src.services.file_lock import FileLockManager

_redis_client = None
_file_lock_manager = None

def get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        _redis_client = redis.from_url(redis_url)
    return _redis_client

def get_file_lock_manager() -> FileLockManager:
    global _file_lock_manager
    if _file_lock_manager is None:
        client = get_redis_client()
        _file_lock_manager = FileLockManager(client)
    return _file_lock_manager
