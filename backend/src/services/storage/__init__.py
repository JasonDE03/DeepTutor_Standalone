"""Storage services for MinIO/S3 object storage"""

from .minio_client import MinIOService, FileInfo, get_minio_service

__all__ = ["MinIOService", "FileInfo", "get_minio_service"]
