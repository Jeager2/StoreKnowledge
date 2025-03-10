import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import json

# Base configuration
BASE_DIR = Path(__file__).resolve().parent

# Path to content directory
CONTENT_DIR = os.environ.get("CONTENT_DIR", os.path.join(BASE_DIR, "content"))

# Ensure content directory exists
os.makedirs(CONTENT_DIR, exist_ok=True)

# Server configuration
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", 8000))
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"

# Security settings
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = 60 * 24  # 24 hours
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

# Authentication
USERS_FILE = os.path.join(BASE_DIR, "users.json")


def get_users() -> List[Dict[str, Any]]:
    """Load user information from JSON file."""
    if not os.path.exists(USERS_FILE):
        # Create default admin user if file doesn't exist
        default_users = [
            {
                "id": "1",
                "username": "admin",
                "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # "password"
                "is_admin": True
            }
        ]
        with open(USERS_FILE, "w") as f:
            json.dump(default_users, f, indent=2)
        return default_users

    with open(USERS_FILE, "r") as f:
        return json.load(f)


def save_users(users: List[Dict[str, Any]]) -> None:
    """Save user information to JSON file."""
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)


# File system settings
ALLOWED_EXTENSIONS = {
    # Markdown
    "md", "markdown",
    # Images
    "jpg", "jpeg", "png", "gif", "svg",
    # Documents
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
    # Other
    "json", "yaml", "yml"
}

# Maximum file size for uploads (10MB)
MAX_CONTENT_LENGTH = 10 * 1024 * 1024

# Asset folders
ASSETS_FOLDER = "assets"
IMAGES_FOLDER = f"{ASSETS_FOLDER}/Images"
VIDEOS_FOLDER = f"{ASSETS_FOLDER}/Videos"
PDF_FOLDER = f"{ASSETS_FOLDER}/PDF"


# Ensure asset folders exist in content directory
def ensure_asset_folders(base_folder: Optional[str] = None) -> None:
    """Create asset folders if they don't exist."""
    base = Path(base_folder) if base_folder else Path(CONTENT_DIR)

    for folder in [ASSETS_FOLDER, IMAGES_FOLDER, VIDEOS_FOLDER, PDF_FOLDER]:
        folder_path = base / folder
        folder_path.mkdir(exist_ok=True, parents=True)


# Default settings
DEFAULT_SETTINGS = {
    "theme": "light",
    "font_size": "medium",
    "line_spacing": 1.6,
    "default_view": "read"
}


# Load user settings
def get_user_settings(user_id: str) -> Dict[str, Any]:
    """Load user settings from JSON file."""
    settings_file = os.path.join(BASE_DIR, f"settings_{user_id}.json")
    if not os.path.exists(settings_file):
        return DEFAULT_SETTINGS

    with open(settings_file, "r") as f:
        return json.load(f)


def save_user_settings(user_id: str, settings: Dict[str, Any]) -> None:
    """Save user settings to JSON file."""
    settings_file = os.path.join(BASE_DIR, f"settings_{user_id}.json")
    with open(settings_file, "w") as f:
        json.dump(settings, f, indent=2)