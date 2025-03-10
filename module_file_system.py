"""
File system module for the Markdown Editor.
Handles file operations like listing directories, reading/writing files, etc.
"""
import os
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from module_auth import get_current_user, User

# Router setup
file_router = APIRouter()


# Model definitions
class FileItem(BaseModel):
    name: str
    path: str
    type: str  # "file" or "directory"
    modified: str
    size: Optional[int] = None


class DirectoryListing(BaseModel):
    path: str
    items: List[FileItem]


class FileContent(BaseModel):
    path: str
    content: str
    modified: str


class FileCreate(BaseModel):
    path: str
    content: str


class FileUpdate(BaseModel):
    path: str
    content: str


class FileDelete(BaseModel):
    path: str


class FolderCreate(BaseModel):
    path: str


class FileMove(BaseModel):
    old_path: str
    new_path: str


# Base directory for all files
# Update this to your desired location
BASE_FILES_DIR = Path(os.getenv("FILES_DIR", os.path.expanduser("~/markdown_editor_files")))

# Create base directory if it doesn't exist
if not BASE_FILES_DIR.exists():
    BASE_FILES_DIR.mkdir(parents=True)


# Helper functions
def normalize_path(path: str) -> Path:
    """Normalize and validate a path to ensure it's within the base directory"""
    # Make sure the path doesn't try to escape the base directory
    norm_path = os.path.normpath(path)
    if norm_path.startswith('..') or norm_path.startswith('/') or norm_path.startswith('\\'):
        norm_path = norm_path.lstrip('./\\')

    full_path = BASE_FILES_DIR / norm_path

    # Check if the resolved path is within the base directory
    if not str(full_path.resolve()).startswith(str(BASE_FILES_DIR.resolve())):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to this path is forbidden"
        )

    return full_path


def get_file_info(path: Path) -> FileItem:
    """Get file information for a path"""
    relative_path = str(path.relative_to(BASE_FILES_DIR)).replace('\\', '/')
    if path.is_dir():
        return FileItem(
            name=path.name,
            path=relative_path,
            type="directory",
            modified=datetime.fromtimestamp(path.stat().st_mtime).isoformat(),
            size=None
        )
    else:
        return FileItem(
            name=path.name,
            path=relative_path,
            type="file",
            modified=datetime.fromtimestamp(path.stat().st_mtime).isoformat(),
            size=path.stat().st_size
        )


# Routes
@file_router.get("/list", response_model=DirectoryListing)
async def list_directory(path: str = "", current_user: User = Depends(get_current_user)):
    """List contents of a directory"""
    dir_path = normalize_path(path)

    if not dir_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Directory not found: {path}"
        )

    if not dir_path.is_dir():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not a directory: {path}"
        )

    items = []
    for item in dir_path.iterdir():
        items.append(get_file_info(item))

    # Sort items: directories first, then files, alphabetically
    items.sort(key=lambda x: (x.type != "directory", x.name.lower()))

    return DirectoryListing(
        path=str(dir_path.relative_to(BASE_FILES_DIR)).replace('\\', '/'),
        items=items
    )


@file_router.get("/content", response_model=FileContent)
async def get_file_content(path: str, current_user: User = Depends(get_current_user)):
    """Get content of a file"""
    file_path = normalize_path(path)

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {path}"
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not a file: {path}"
        )

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        return FileContent(
            path=str(file_path.relative_to(BASE_FILES_DIR)).replace('\\', '/'),
            content=content,
            modified=datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
        )
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File is not a text file: {path}"
        )


@file_router.post("/create", response_model=FileContent)
async def create_file(file_data: FileCreate, current_user: User = Depends(get_current_user)):
    """Create a new file"""
    file_path = normalize_path(file_data.path)

    if file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File already exists: {file_data.path}"
        )

    # Create parent directories if they don't exist
    file_path.parent.mkdir(parents=True, exist_ok=True)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(file_data.content)

    return FileContent(
        path=str(file_path.relative_to(BASE_FILES_DIR)).replace('\\', '/'),
        content=file_data.content,
        modified=datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
    )


@file_router.post("/update", response_model=FileContent)
async def update_file(file_data: FileUpdate, current_user: User = Depends(get_current_user)):
    """Update an existing file"""
    file_path = normalize_path(file_data.path)

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {file_data.path}"
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not a file: {file_data.path}"
        )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(file_data.content)

    return FileContent(
        path=str(file_path.relative_to(BASE_FILES_DIR)).replace('\\', '/'),
        content=file_data.content,
        modified=datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
    )


@file_router.post("/delete")
async def delete_file(file_data: FileDelete, current_user: User = Depends(get_current_user)):
    """Delete a file or directory"""
    path = normalize_path(file_data.path)

    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Path not found: {file_data.path}"
        )

    try:
        if path.is_file():
            path.unlink()
        else:
            # Check if directory is empty
            if any(path.iterdir()):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Directory is not empty: {file_data.path}"
                )
            path.rmdir()

        return {"message": f"Successfully deleted: {file_data.path}"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete: {str(e)}"
        )


@file_router.post("/create-folder")
async def create_folder(folder_data: FolderCreate, current_user: User = Depends(get_current_user)):
    """Create a new folder"""
    folder_path = normalize_path(folder_data.path)

    if folder_path.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Folder already exists: {folder_data.path}"
        )

    folder_path.mkdir(parents=True, exist_ok=True)

    return {"message": f"Successfully created folder: {folder_data.path}"}


@file_router.post("/move")
async def move_file(move_data: FileMove, current_user: User = Depends(get_current_user)):
    """Move a file or directory to a new location"""
    old_path = normalize_path(move_data.old_path)
    new_path = normalize_path(move_data.new_path)

    if not old_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Path not found: {move_data.old_path}"
        )

    if new_path.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Destination already exists: {move_data.new_path}"
        )

    # Create parent directories if they don't exist
    new_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        # Rename (move) the file/directory
        old_path.rename(new_path)

        return {
            "message": f"Successfully moved from {move_data.old_path} to {move_data.new_path}",
            "old_path": move_data.old_path,
            "new_path": move_data.new_path
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to move: {str(e)}"
        )


@file_router.post("/upload")
async def upload_file(
        file: UploadFile = File(...),
        path: str = Form(...),
        current_user: User = Depends(get_current_user)
):
    """Upload a file to a specific path"""
    # Normalize the directory path
    dir_path = normalize_path(path)

    # Create directory if it doesn't exist
    dir_path.mkdir(parents=True, exist_ok=True)

    # Create the full file path
    file_path = dir_path / file.filename

    # Write the file
    with open(file_path, "wb") as f:
        f.write(await file.read())

    return {
        "filename": file.filename,
        "path": str(file_path.relative_to(BASE_FILES_DIR)).replace('\\', '/'),
        "size": file_path.stat().st_size
    }


@file_router.get("/download")
async def download_file(path: str, current_user: User = Depends(get_current_user)):
    """Download a file"""
    file_path = normalize_path(path)

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {path}"
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not a file: {path}"
        )

    return FileResponse(
        path=file_path,
        filename=file_path.name,
        media_type="application/octet-stream"
    )


def list_files_recursive(root_dir, extensions=None):
    """
    Recursively list all files with specific extensions in a directory
    """
    files = []
    root_path = Path(root_dir)

    for path in root_path.rglob('*'):
        if path.is_file():
            if extensions is None or any(str(path).lower().endswith(ext.lower()) for ext in extensions):
                files.append(str(path))

    return files


def ensure_valid_path(path):
    """Ensure a path is valid and within the allowed directory"""
    return str(normalize_path(path))


def save_file_content(path: str, content: str):
    """Save content to a file, creating or updating it as needed"""
    file_path = normalize_path(path)

    # Create parent directories if they don't exist
    file_path.parent.mkdir(parents=True, exist_ok=True)

    # Write the content to the file
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

    return {
        "path": str(file_path.relative_to(BASE_FILES_DIR)).replace('\\', '/'),
        "content": content,
        "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
    }