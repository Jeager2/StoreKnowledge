import os
import shutil
import mimetypes
from pathlib import Path
from typing import List, Dict, Any, Union, Tuple, Optional
import re
import yaml
from datetime import datetime

# Setup mime types
mimetypes.init()
mimetypes.add_type('text/markdown', '.md')
mimetypes.add_type('text/markdown', '.markdown')


def normalize_path(path: str) -> str:
    """Normalize a file path to prevent directory traversal attacks."""
    # Convert to posix path and normalize
    path = os.path.normpath(path).replace('\\', '/')

    # Remove any leading slashes or dots to prevent going above root
    path = path.lstrip('./\\')

    # Remove any attempts to go up directories
    while '../' in path:
        path = path.replace('../', '')

    return path


def get_file_info(file_path: Union[str, Path], base_dir: Union[str, Path]) -> Dict[str, Any]:
    """Get information about a file."""
    path = Path(file_path)
    rel_path = str(path.relative_to(base_dir))

    is_dir = path.is_dir()

    if is_dir:
        return {
            "name": path.name,
            "path": rel_path,
            "type": "folder",
            "modified": datetime.fromtimestamp(path.stat().st_mtime).isoformat(),
        }
    else:
        # Get file size and modification time
        stats = path.stat()

        # Determine mime type
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            if path.suffix.lower() == '.md':
                mime_type = 'text/markdown'
            else:
                mime_type = 'application/octet-stream'

        return {
            "name": path.name,
            "path": rel_path,
            "type": "file",
            "size": stats.st_size,
            "modified": datetime.fromtimestamp(stats.st_mtime).isoformat(),
            "mime_type": mime_type,
        }


def get_directory_tree(directory: Union[str, Path], base_dir: Union[str, Path]) -> List[Dict[str, Any]]:
    """Recursively generate a directory tree structure."""
    result = []
    directory_path = Path(directory)

    if not directory_path.exists():
        return result

    try:
        for item in sorted(directory_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
            # Skip hidden files
            if item.name.startswith('.'):
                continue

            file_info = get_file_info(item, base_dir)

            if item.is_dir():
                children = get_directory_tree(item, base_dir)
                if children:
                    file_info["children"] = children

            result.append(file_info)
    except PermissionError:
        # Skip directories we don't have permission to read
        pass

    return result


def ensure_directory(directory: Union[str, Path]) -> None:
    """Ensure a directory exists."""
    Path(directory).mkdir(parents=True, exist_ok=True)


def parse_markdown_frontmatter(content: str) -> Tuple[Dict[str, Any], str]:
    """Parse YAML frontmatter from markdown content."""
    frontmatter_pattern = re.compile(r'^---\s*\n(.*?)\n---\s*\n', re.DOTALL)
    match = frontmatter_pattern.match(content)

    if match:
        frontmatter_text = match.group(1)
        try:
            frontmatter = yaml.safe_load(frontmatter_text)
            if not isinstance(frontmatter, dict):
                frontmatter = {}
        except yaml.YAMLError:
            frontmatter = {}

        # Remove frontmatter from content
        content = content[match.end():]
    else:
        frontmatter = {}

    return frontmatter, content


def extract_kanban_settings(content: str) -> Optional[Dict[str, Any]]:
    """Extract Kanban plugin settings from markdown content."""
    settings_pattern = re.compile(r'%% Kanban:settings\s*\n```(.*?)```', re.DOTALL)
    match = settings_pattern.search(content)

    if match:
        settings_json = match.group(1).strip()
        try:
            settings = json.loads(settings_json)
            return settings
        except json.JSONDecodeError:
            pass

    return None


def extract_dataview_queries(content: str) -> List[Dict[str, Any]]:
    """Extract Dataview queries from markdown content."""
    dataview_pattern = re.compile(r'```dataview\s*\n(.*?)```', re.DOTALL)
    matches = dataview_pattern.finditer(content)

    results = []
    for match in matches:
        query = match.group(1).strip()
        results.append({
            "query": query,
            "start": match.start(),
            "end": match.end()
        })

    return results


def safe_delete(path: Union[str, Path]) -> bool:
    """Safely delete a file or directory."""
    path = Path(path)

    try:
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink()
        return True
    except Exception as e:
        print(f"Error deleting {path}: {e}")
        return False


def safe_rename(src: Union[str, Path], dst: Union[str, Path]) -> bool:
    """Safely rename/move a file or directory."""
    src_path = Path(src)
    dst_path = Path(dst)

    try:
        # Create parent directory if it doesn't exist
        dst_path.parent.mkdir(parents=True, exist_ok=True)

        # Move the file/directory
        shutil.move(src_path, dst_path)
        return True
    except Exception as e:
        print(f"Error moving {src} to {dst}: {e}")
        return False