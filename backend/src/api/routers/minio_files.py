"""
MinIO Files API Router
=====================

REST API endpoints for managing files in MinIO object storage.
Provides file browser, search, read, and write operations.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
import logging

from src.services.storage import get_minio_service, FileInfo

logger = logging.getLogger("MinIOFilesRouter")

router = APIRouter(prefix="/api/v1/files", tags=["files"])


# ============================================================================
# Request/Response Models
# ============================================================================

class FileMetadata(BaseModel):
    """File metadata response"""
    name: str
    size: int
    last_modified: str
    content_type: str
    is_dir: bool = False


class FilesListResponse(BaseModel):
    """Response for file listing"""
    files: List[FileMetadata]
    total: int


class FileContentResponse(BaseModel):
    """Response for file content"""
    content: str
    metadata: FileMetadata


class SaveFileRequest(BaseModel):
    """Request to save file"""
    content: str


class FileVersion(BaseModel):
    """File version metadata"""
    version_id: str
    last_modified: str
    size: int
    is_latest: bool
    is_delete_marker: bool


class FileVersionsResponse(BaseModel):
    """Response for file versions listing"""
    versions: List[FileVersion]
    total: int



class SaveFileResponse(BaseModel):
    """Response after saving file"""
    success: bool
    message: str
    size: int


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/buckets", response_model=dict)
async def list_buckets():
    """
    List all available MinIO buckets.
    
    Returns:
    -------
        {"buckets": ["bucket1", "bucket2", ...]}
    """
    try:
        minio = get_minio_service()
        buckets = minio.list_buckets()
        return {"buckets": buckets}
    except Exception as e:
        logger.error(f"Failed to list buckets: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list buckets: {str(e)}")


@router.get("/{bucket}", response_model=FilesListResponse)
async def list_files(
    bucket: str,
    prefix: str = Query("", description="Filter by prefix"),
    recursive: bool = Query(False, description="List recursively"),
    search: str = Query("", description="Search query for filenames"),
    extensions: str = Query(".md,.markdown,.txt", description="Comma-separated file extensions")
):
    """
    List files in a bucket.
    
    Parameters:
    ----------
    bucket : str
        Bucket name
    prefix : str, optional
        Filter by prefix (e.g., "docs/")
    recursive : bool, optional
        List recursively (default: False)
    search : str, optional
        Search query for filename
    extensions : str, optional
        Comma-separated extensions (default: .md,.markdown,.txt)
    
    Returns:
    -------
        FilesListResponse with files and total count
    """
    try:
        minio = get_minio_service()
        
        # Parse extensions
        ext_list = [ext.strip() for ext in extensions.split(",") if ext.strip()]
        
        # Get files
        if search:
            files = minio.search_files(bucket, search, prefix)
        else:
            files = minio.list_files(bucket, prefix, recursive=recursive, extensions=ext_list)
        
        # Convert to response format
        file_metadata = [
            FileMetadata(
                name=f.name,
                size=f.size,
                last_modified=f.last_modified.isoformat() if f.last_modified else "",
                content_type=f.content_type,
                is_dir=f.is_dir
            )
            for f in files
        ]
        
        return FilesListResponse(files=file_metadata, total=len(file_metadata))
        
    except Exception as e:
        logger.error(f"Failed to list files in {bucket}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")


@router.get("/{bucket}/{path:path}/versions", response_model=FileVersionsResponse)
async def list_file_versions(bucket: str, path: str):
    """
    List all versions of a file.
    
    Parameters:
    ----------
    bucket : str
        Bucket name
    path : str
        File path in bucket
    
    Returns:
    -------
        FileVersionsResponse with list of versions
    """
    try:
        minio = get_minio_service()
        
        # Get versions
        versions_data = minio.list_file_versions(bucket, path)
        
        # Convert to response model
        versions = [
            FileVersion(
                version_id=v["version_id"],
                last_modified=v["last_modified"],
                size=v["size"],
                is_latest=v["is_latest"],
                is_delete_marker=v["is_delete_marker"]
            )
            for v in versions_data
        ]
        
        return FileVersionsResponse(versions=versions, total=len(versions))
        
    except Exception as e:
        logger.error(f"Failed to list versions for {bucket}/{path}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list versions: {str(e)}")


@router.get("/{bucket}/{path:path}/versions/{version_id}", response_model=FileContentResponse)
async def get_file_version(bucket: str, path: str, version_id: str):
    """
    Get specific version of a file.
    
    Parameters:
    ----------
    bucket : str
        Bucket name
    path : str
        File path in bucket
    version_id : str
        Version ID to retrieve
    
    Returns:
    -------
        FileContentResponse with version content and metadata
    """
    try:
        minio = get_minio_service()
        
        # Read version content
        content = minio.get_file_version(bucket, path, version_id)
        
        # Get version metadata from versions list
        versions_data = minio.list_file_versions(bucket, path)
        version_info = next((v for v in versions_data if v["version_id"] == version_id), None)
        
        if not version_info:
            raise HTTPException(status_code=404, detail=f"Version not found: {version_id}")
        
        metadata = FileMetadata(
            name=path,
            size=version_info["size"],
            last_modified=version_info["last_modified"],
            content_type="",  # MinIO doesn't track content type per version
            is_dir=False
        )
        
        return FileContentResponse(content=content, metadata=metadata)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get version {version_id} for {bucket}/{path}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get version: {str(e)}")


@router.get("/{bucket}/{path:path}", response_model=FileContentResponse)
async def get_file(bucket: str, path: str):
    """
    Read file content.
    
    Parameters:
    ----------
    bucket : str
        Bucket name
    path : str
        File path in bucket
    
    Returns:
    -------
        FileContentResponse with content and metadata
    """
    try:
        minio = get_minio_service()
        
        # Check if file exists
        if not minio.file_exists(bucket, path):
            raise HTTPException(status_code=404, detail=f"File not found: {bucket}/{path}")
        
        # Read content
        content = minio.get_file(bucket, path)
        
        # Get metadata
        files = minio.list_files(bucket, prefix=path, recursive=False)
        if not files:
            raise HTTPException(status_code=404, detail=f"File metadata not found: {bucket}/{path}")
        
        file_info = files[0]
        metadata = FileMetadata(
            name=file_info.name,
            size=file_info.size,
            last_modified=file_info.last_modified.isoformat() if file_info.last_modified else "",
            content_type=file_info.content_type,
            is_dir=file_info.is_dir
        )
        
        return FileContentResponse(content=content, metadata=metadata)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to read file {bucket}/{path}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")


@router.put("/{bucket}/{path:path}", response_model=SaveFileResponse)
async def save_file(bucket: str, path: str, request: SaveFileRequest):
    """
    Save file content.
    
    Parameters:
    ----------
    bucket : str
        Bucket name
    path : str
        File path in bucket
    request : SaveFileRequest
        File content to save
    
    Returns:
    -------
        SaveFileResponse with success status and file size
    """
    try:
        minio = get_minio_service()
        
        # Save file
        size = minio.save_file(bucket, path, request.content)
        
        return SaveFileResponse(
            success=True,
            message=f"File saved successfully: {bucket}/{path}",
            size=size
        )
        
    except Exception as e:
        logger.error(f"Failed to save file {bucket}/{path}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")


@router.delete("/{bucket}/{path:path}", response_model=dict)
async def delete_file(bucket: str, path: str):
    """
    Delete a file.
    
    Parameters:
    ----------
    bucket : str
        Bucket name
    path : str
        File path in bucket
    
    Returns:
    -------
        {"success": true, "message": "..."}
    """
    try:
        minio = get_minio_service()
        
        # Check if file exists
        if not minio.file_exists(bucket, path):
            raise HTTPException(status_code=404, detail=f"File not found: {bucket}/{path}")
        
        # Delete file
        minio.delete_file(bucket, path)
        
        return {
            "success": True,
            "message": f"File deleted successfully: {bucket}/{path}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete file {bucket}/{path}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
