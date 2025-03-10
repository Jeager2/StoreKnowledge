from fastapi import APIRouter, Depends, HTTPException, Body
import os
import re
from typing import List, Dict, Any, Optional
import markdown
from pathlib import Path
import shutil

from module_auth import get_current_user
from module_file_system import list_files_recursive, get_file_content, ensure_valid_path

search_router = APIRouter(prefix="/api/search", tags=["search"])


def search_in_file(file_path: str, query: str, case_sensitive: bool = False) -> Dict[str, Any]:
    """
    Search for a query within a file and return matches with context
    """
    try:
        content = get_file_content(file_path)

        # Prepare search flags
        flags = 0 if case_sensitive else re.IGNORECASE

        # Find all occurrences of the query
        matches = []
        for i, line in enumerate(content.split('\n')):
            line_matches = []
            for match in re.finditer(re.escape(query), line, flags):
                start, end = match.span()
                line_matches.append({
                    "start": start,
                    "end": end,
                    "text": line[start:end]
                })

            if line_matches:
                matches.append({
                    "line_number": i + 1,
                    "line_text": line,
                    "matches": line_matches
                })

        # If no matches were found, return None
        if not matches:
            return None

        return {
            "file_path": file_path,
            "filename": os.path.basename(file_path),
            "matches": matches,
            "match_count": sum(len(m["matches"]) for m in matches)
        }
    except Exception as e:
        print(f"Error searching in file {file_path}: {str(e)}")
        return None


@search_router.post("/files")
async def search_files(
        search_query: Dict[str, Any] = Body(...),
        user: dict = Depends(get_current_user)
):
    """
    Search for files matching a query in a specific directory
    """
    try:
        query = search_query.get("query", "")
        folder_path = search_query.get("folder", "")
        file_extensions = search_query.get("extensions", [".md"])
        case_sensitive = search_query.get("caseSensitive", False)

        if not query:
            raise HTTPException(status_code=400, detail="Search query is required")

        # Ensure folder path is valid
        root_dir = ensure_valid_path(folder_path) if folder_path else os.getcwd()

        # Get all files with the specified extensions
        all_files = list_files_recursive(root_dir, file_extensions)

        # Search in each file
        results = []
        for file_path in all_files:
            result = search_in_file(file_path, query, case_sensitive)
            if result:
                # Calculate relative path from the root directory
                rel_path = os.path.relpath(file_path, root_dir)
                result["relative_path"] = rel_path
                results.append(result)

        # Sort results by match count (most matches first)
        results.sort(key=lambda x: x["match_count"], reverse=True)

        return {
            "query": query,
            "results": results,
            "total_files": len(results),
            "total_matches": sum(r["match_count"] for r in results)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@search_router.post("/content")
async def search_content(
        search_query: Dict[str, Any] = Body(...),
        user: dict = Depends(get_current_user)
):
    """
    Search for content within files and return matches with context
    """
    try:
        query = search_query.get("query", "")
        folder_path = search_query.get("folder", "")
        file_extensions = search_query.get("extensions", [".md"])
        case_sensitive = search_query.get("caseSensitive", False)
        limit = search_query.get("limit", 100)

        if not query:
            raise HTTPException(status_code=400, detail="Search query is required")

        # Ensure folder path is valid
        root_dir = ensure_valid_path(folder_path) if folder_path else os.getcwd()

        # Get all files with the specified extensions
        all_files = list_files_recursive(root_dir, file_extensions)

        # Search in each file
        results = []
        for file_path in all_files:
            result = search_in_file(file_path, query, case_sensitive)
            if result:
                # Calculate relative path from the root directory
                rel_path = os.path.relpath(file_path, root_dir)
                result["relative_path"] = rel_path
                results.append(result)

                # Stop if we've reached the limit
                if len(results) >= limit:
                    break

        # Sort results by match count (most matches first)
        results.sort(key=lambda x: x["match_count"], reverse=True)

        return {
            "query": query,
            "results": results,
            "total_files": len(results),
            "total_matches": sum(r["match_count"] for r in results)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@search_router.post("/quick")
async def quick_search(
        search_query: Dict[str, Any] = Body(...),
        user: dict = Depends(get_current_user)
):
    """
    Quick search for files by name or content (simplified results)
    """
    try:
        query = search_query.get("query", "")
        folder_path = search_query.get("folder", "")

        if not query:
            raise HTTPException(status_code=400, detail="Search query is required")

        # Ensure folder path is valid
        root_dir = ensure_valid_path(folder_path) if folder_path else os.getcwd()

        # Get all markdown files
        all_files = list_files_recursive(root_dir, [".md"])

        # Quick search in filenames and contents
        results = []
        for file_path in all_files:
            file_name = os.path.basename(file_path)

            # Check if query matches filename
            filename_match = re.search(re.escape(query), file_name, re.IGNORECASE)
            content_match = False

            # If not matched in filename, check content
            if not filename_match:
                try:
                    content = get_file_content(file_path)
                    content_match = re.search(re.escape(query), content, re.IGNORECASE)
                except:
                    pass

            # If either matched, add to results
            if filename_match or content_match:
                rel_path = os.path.relpath(file_path, root_dir)
                results.append({
                    "file_path": file_path,
                    "relative_path": rel_path,
                    "filename": file_name,
                    "matched_in": "filename" if filename_match else "content"
                })

        return {
            "query": query,
            "results": results,
            "total_matches": len(results)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quick search failed: {str(e)}")


def setup_search_routes(app):
    app.include_router(search_router)