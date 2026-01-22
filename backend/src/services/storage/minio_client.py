"""
MinIO Storage Service
====================

Service layer for MinIO object storage operations.
Provides async methods for file listing, reading, writing, and searching.
"""

import os
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from minio import Minio
from minio.error import S3Error

logger = logging.getLogger("MinIOService")


class FileInfo:
    """File metadata from MinIO"""
    def __init__(self, name: str, size: int, last_modified: datetime, content_type: str = "", is_dir: bool = False):
        self.name = name
        self.size = size
        self.last_modified = last_modified
        self.content_type = content_type
        self.is_dir = is_dir
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "size": self.size,
            "last_modified": self.last_modified.isoformat() if self.last_modified else None,
            "content_type": self.content_type,
            "is_dir": self.is_dir
        }


class MinIOService:
    """
    MinIO client service for object storage operations.
    
    Environment variables:
        MINIO_ENDPOINT: MinIO server endpoint (e.g., localhost:9002)
        MINIO_ACCESS_KEY: Access key
        MINIO_SECRET_KEY: Secret key
        MINIO_USE_SSL: Use HTTPS (default: false)
        MINIO_DEFAULT_BUCKET: Default bucket name
    """
    
    def __init__(
        self,
        endpoint: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        secure: Optional[bool] = None,
    ):
        """
        Initialize MinIO client.
        
        Args:
            endpoint: MinIO server endpoint (defaults to env MINIO_ENDPOINT)
            access_key: MinIO access key (defaults to env MINIO_ACCESS_KEY)
            secret_key: MinIO secret key (defaults to env MINIO_SECRET_KEY)
            secure: Use HTTPS (defaults to env MINIO_USE_SSL)
        """
        self.endpoint = endpoint or os.getenv("MINIO_ENDPOINT", "localhost:9002")
        self.access_key = access_key or os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        self.secret_key = secret_key or os.getenv("MINIO_SECRET_KEY", "minioadmin")
        self.secure = secure if secure is not None else os.getenv("MINIO_USE_SSL", "false").lower() == "true"
        self.default_bucket = os.getenv("MINIO_DEFAULT_BUCKET", "wonderpedia")
        
        # Initialize MinIO client
        self.client = Minio(
            self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=self.secure
        )
        
        logger.info(f"MinIO client initialized: {self.endpoint} (secure={self.secure})")
    
    def list_buckets(self) -> List[str]:
        """
        List all available buckets.
        
        Returns:
            List of bucket names
        """
        try:
            buckets = self.client.list_buckets()
            return [bucket.name for bucket in buckets]
        except S3Error as e:
            logger.error(f"Failed to list buckets: {e}")
            raise

    def list_files(
        self,
        bucket: str,
        prefix: str = "",
        recursive: bool = False,
        extensions: Optional[List[str]] = None
    ) -> List[FileInfo]:
        """
        List files in a bucket.
        
        Args:
            bucket: Bucket name
            prefix: Filter by prefix (e.g., "docs/")
            recursive: List recursively (default: False)
            extensions: Filter by file extensions (e.g., [".md", ".txt"])
        
        Returns:
            List of FileInfo objects
        """
        try:
            objects = self.client.list_objects(
                bucket,
                prefix=prefix,
                recursive=recursive
            )
            
            files = []
            for obj in objects:
                is_dir = obj.is_dir
                
                # Filter by extension if specified, but ONLY for files
                if not is_dir and extensions:
                    if not any(obj.object_name.endswith(ext) for ext in extensions):
                        continue
                
                # Directories have no size/date in MinIO listing
                size = obj.size if obj.size is not None else 0
                last_modified = obj.last_modified if obj.last_modified else datetime.now() 
                
                files.append(FileInfo(
                    name=obj.object_name,
                    size=size,
                    last_modified=last_modified,
                    content_type=obj.content_type or "",
                    is_dir=is_dir
                ))
            
            logger.info(f"Listed {len(files)} items from {bucket}/{prefix} (recursive={recursive})")
            return files
            
        except S3Error as e:
            logger.error(f"Failed to list files in {bucket}: {e}")
            raise
    
    def search_files(
        self,
        bucket: str,
        query: str,
        prefix: str = "",
        case_sensitive: bool = False
    ) -> List[FileInfo]:
        """
        Search files by name.
        
        Args:
            bucket: Bucket name
            query: Search query
            prefix: Filter by prefix
            case_sensitive: Case-sensitive search (default: False)
        
        Returns:
            List of matching FileInfo objects
        """
        all_files = self.list_files(bucket, prefix)
        
        if not case_sensitive:
            query = query.lower()
        
        matches = []
        for file in all_files:
            filename = file.name if case_sensitive else file.name.lower()
            if query in filename:
                matches.append(file)
        
        logger.info(f"Found {len(matches)} files matching '{query}' in {bucket}")
        return matches
    
    def get_file(self, bucket: str, path: str) -> str:
        """
        Read file content as string.
        
        Args:
            bucket: Bucket name
            path: File path in bucket
        
        Returns:
            File content as string
        
        Raises:
            S3Error: If file not found or read error
        """
        try:
            response = self.client.get_object(bucket, path)
            content = response.read().decode('utf-8')
            response.close()
            response.release_conn()
            
            logger.info(f"Read file {bucket}/{path} ({len(content)} bytes)")
            return content
            
        except S3Error as e:
            logger.error(f"Failed to read file {bucket}/{path}: {e}")
            raise
    
    def save_file(self, bucket: str, path: str, content: str) -> int:
        """
        Save file content.
        
        Args:
            bucket: Bucket name
            path: File path in bucket
            content: File content as string
        
        Returns:
            File size in bytes
        
        Raises:
            S3Error: If write error
        """
        try:
            from io import BytesIO
            
            data = content.encode('utf-8')
            data_stream = BytesIO(data)
            
            self.client.put_object(
                bucket,
                path,
                data_stream,
                length=len(data),
                content_type="text/markdown"
            )
            
            logger.info(f"Saved file {bucket}/{path} ({len(data)} bytes)")
            return len(data)
            
        except S3Error as e:
            logger.error(f"Failed to save file {bucket}/{path}: {e}")
            raise
    
    def delete_file(self, bucket: str, path: str) -> bool:
        """
        Delete a file.
        
        Args:
            bucket: Bucket name
            path: File path in bucket
        
        Returns:
            True if successful
        
        Raises:
            S3Error: If delete error
        """
        try:
            self.client.remove_object(bucket, path)
            logger.info(f"Deleted file {bucket}/{path}")
            return True
            
        except S3Error as e:
            logger.error(f"Failed to delete file {bucket}/{path}: {e}")
            raise
    
    def file_exists(self, bucket: str, path: str) -> bool:
        """
        Check if file exists.
        
        Args:
            bucket: Bucket name
            path: File path in bucket
        
        Returns:
            True if file exists
        """
        try:
            self.client.stat_object(bucket, path)
            return True
        except S3Error:
            return False


# Global service instance
_minio_service: Optional[MinIOService] = None


def get_minio_service() -> MinIOService:
    """Get global MinIO service instance"""
    global _minio_service
    if _minio_service is None:
        _minio_service = MinIOService()
    return _minio_service
