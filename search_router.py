from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any, List
from pydantic import BaseModel

from module_auth import get_current_user
from module_search import search_in_file

search_router = APIRouter(prefix="/api/search", tags=["search"])

class SearchQuery(BaseModel):
    query: str
    folder: str = ""
    extensions: List[str] = [".md"]
    case_sensitive: bool = False
    limit: int = 100

@search_router.post("/")
async def search(
    search_query: SearchQuery,
    user: dict = Depends(get_current_user)
):
    """
    Unified search endpoint that provides comprehensive search functionality
    """
    from module_search import search_files
    return await search_files(search_query.dict(), user)

@search_router.post("/recent")
async def get_recent_searches(
    user: dict = Depends(get_current_user)
):
    """
    Get recent searches for the current user
    """
    # This would typically be stored in a database
    # For this example, we're returning a mock list
    return {
        "recent_searches": [
            {"query": "project", "timestamp": "2023-04-10T15:30:00Z"},
            {"query": "meeting notes", "timestamp": "2023-04-09T10:15:00Z"},
            {"query": "recipe", "timestamp": "2023-04-08T18:45:00Z"}
        ]
    }

@search_router.post("/save")
async def save_search(
    search_data: Dict[str, Any] = Body(...),
    user: dict = Depends(get_current_user)
):
    """
    Save a search query for later use
    """
    # This would typically save to a database
    # For this example, we'll just return a success message
    return {"message": "Search saved successfully"}

def setup_routes(app):
    app.include_router(search_router)