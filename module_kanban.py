from fastapi import APIRouter, Depends, HTTPException, Body
import os
import re
import json
from typing import List, Dict, Any, Optional
import markdown
from pathlib import Path

from module_auth import get_current_user
from module_file_system import get_file_content, save_file_content, ensure_valid_path

kanban_router = APIRouter(prefix="/api/kanban", tags=["kanban"])


def parse_kanban_md(content: str) -> Dict[str, Any]:
    """
    Parse markdown content to extract kanban board structure
    """
    kanban_data = {
        "lanes": [],
        "settings": {}
    }

    # Extract kanban settings if they exist
    settings_match = re.search(r'Kanban:settings\s+"(.*?)"\s*$', content, re.MULTILINE | re.DOTALL)
    if settings_match:
        settings_json = settings_match.group(1).replace('\n', ' ')
        # Replace escaped quotes
        settings_json = settings_json.replace('\\"', '"')
        # Handle JS-style comments in settings JSON
        settings_json = re.sub(r'//[^\n]*\n', '\n', settings_json)

        try:
            settings = json.loads(settings_json)
            kanban_data["settings"] = settings
        except json.JSONDecodeError as e:
            print(f"Error parsing kanban settings: {e}")

    # Extract lanes (based on ## headers)
    lane_pattern = r'##\s+([^\n]+)\n(.*?)(?=\n##\s+|\n*Kanban:settings|$)'
    lane_matches = re.findall(lane_pattern, content, re.DOTALL)

    for lane_title, lane_content in lane_matches:
        lane = {
            "title": lane_title.strip(),
            "items": []
        }

        # Extract items (task items with optional links and tags)
        item_pattern = r'- \[([ xX])\] (.+?)(?=\n- \[|\n*$)'
        item_matches = re.findall(item_pattern, lane_content, re.DOTALL)

        for status, item_content in item_matches:
            completed = status.lower() == 'x'

            # Parse out wikilinks [[link]] if they exist
            links = []
            link_pattern = r'\[\[(.*?)\]\]'
            for link_match in re.finditer(link_pattern, item_content):
                link_text = link_match.group(1)
                if '|' in link_text:
                    link_path, link_title = link_text.split('|', 1)
                else:
                    link_path = link_title = link_text

                links.append({
                    "path": link_path.strip(),
                    "title": link_title.strip()
                })

            # Extract tags
            tags = []
            tag_pattern = r'#([a-zA-Z0-9_-]+)'
            for tag_match in re.finditer(tag_pattern, item_content):
                tags.append(tag_match.group(1))

            # Clean up the text by removing extra newlines and spaces
            text = item_content.strip()

            lane["items"].append({
                "text": text,
                "completed": completed,
                "links": links,
                "tags": tags
            })

        kanban_data["lanes"].append(lane)

    return kanban_data


def generate_kanban_md(kanban_data: Dict[str, Any]) -> str:
    """
    Generate markdown content from kanban data structure
    """
    content = ""

    # Add each lane
    for lane in kanban_data.get("lanes", []):
        content += f"## {lane['title']}\n"

        # Add items in the lane
        for item in lane.get("items", []):
            status = "x" if item.get("completed", False) else " "
            content += f"- [{status}] {item['text']}\n"

        content += "\n"

    # Add settings if they exist
    settings = kanban_data.get("settings", {})
    if settings:
        settings_json = json.dumps(settings, ensure_ascii=False)
        content += f'Kanban:settings "{settings_json}"\n'

    return content


@kanban_router.get("/board/{file_path:path}")
async def get_kanban_board(
        file_path: str,
        user: dict = Depends(get_current_user)
):
    """
    Parse a markdown file as a kanban board and return its structure
    """
    try:
        # Ensure the file path is valid and accessible
        file_path = ensure_valid_path(file_path)
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        # Get the markdown content
        content = get_file_content(file_path)

        # Parse the kanban structure
        kanban_data = parse_kanban_md(content)

        return kanban_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse kanban board: {str(e)}")


@kanban_router.put("/board/{file_path:path}")
async def update_kanban_board(
        file_path: str,
        kanban_data: Dict[str, Any] = Body(...),
        user: dict = Depends(get_current_user)
):
    """
    Update a kanban board markdown file with new structure
    """
    try:
        # Ensure the file path is valid and accessible
        file_path = ensure_valid_path(file_path)
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        # Generate markdown content from kanban data
        new_content = generate_kanban_md(kanban_data)

        # Save the updated content
        save_file_content(file_path, new_content)

        return {"message": "Kanban board updated successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update kanban board: {str(e)}")


@kanban_router.post("/item/{file_path:path}")
async def add_kanban_item(
        file_path: str,
        item_data: Dict[str, Any] = Body(...),
        user: dict = Depends(get_current_user)
):
    """
    Add a new item to a kanban board
    """
    try:
        # Ensure the file path is valid and accessible
        file_path = ensure_valid_path(file_path)
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        # Get the current content and parse it
        content = get_file_content(file_path)
        kanban_data = parse_kanban_md(content)

        # Find the lane to add the item to
        lane_title = item_data.get("lane")
        lane_found = False

        for lane in kanban_data["lanes"]:
            if lane["title"] == lane_title:
                lane_found = True
                # Add the new item
                lane["items"].append({
                    "text": item_data.get("text", "New task"),
                    "completed": item_data.get("completed", False),
                    "links": item_data.get("links", []),
                    "tags": item_data.get("tags", [])
                })
                break

        # If lane wasn't found, create it
        if not lane_found:
            kanban_data["lanes"].append({
                "title": lane_title,
                "items": [{
                    "text": item_data.get("text", "New task"),
                    "completed": item_data.get("completed", False),
                    "links": item_data.get("links", []),
                    "tags": item_data.get("tags", [])
                }]
            })

        # Generate updated markdown
        new_content = generate_kanban_md(kanban_data)

        # Save the updated content
        save_file_content(file_path, new_content)

        return {"message": "Item added successfully", "board": kanban_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add kanban item: {str(e)}")


@kanban_router.delete("/item/{file_path:path}")
async def delete_kanban_item(
        file_path: str,
        item_data: Dict[str, Any] = Body(...),
        user: dict = Depends(get_current_user)
):
    """
    Delete an item from a kanban board
    """
    try:
        # Ensure the file path is valid and accessible
        file_path = ensure_valid_path(file_path)
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        # Get the current content and parse it
        content = get_file_content(file_path)
        kanban_data = parse_kanban_md(content)

        # Find the lane and item to delete
        lane_title = item_data.get("lane")
        item_text = item_data.get("text")
        item_index = item_data.get("index", -1)

        for lane in kanban_data["lanes"]:
            if lane["title"] == lane_title:
                # If we have an index, use that
                if item_index >= 0 and item_index < len(lane["items"]):
                    lane["items"].pop(item_index)
                # Otherwise search by text
                elif item_text:
                    for i, item in enumerate(lane["items"]):
                        if item["text"] == item_text:
                            lane["items"].pop(i)
                            break
                break

        # Generate updated markdown
        new_content = generate_kanban_md(kanban_data)

        # Save the updated content
        save_file_content(file_path, new_content)

        return {"message": "Item deleted successfully", "board": kanban_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete kanban item: {str(e)}")


@kanban_router.put("/move/{file_path:path}")
async def move_kanban_item(
        file_path: str,
        move_data: Dict[str, Any] = Body(...),
        user: dict = Depends(get_current_user)
):
    """
    Move an item between lanes or reorder within a lane
    """
    try:
        # Ensure the file path is valid and accessible
        file_path = ensure_valid_path(file_path)
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        # Get the current content and parse it
        content = get_file_content(file_path)
        kanban_data = parse_kanban_md(content)

        # Extract move data
        source_lane = move_data.get("sourceLane")
        target_lane = move_data.get("targetLane")
        source_index = move_data.get("sourceIndex")
        target_index = move_data.get("targetIndex")

        # Find the source lane
        source_item = None
        for lane in kanban_data["lanes"]:
            if lane["title"] == source_lane and 0 <= source_index < len(lane["items"]):
                # Remove the item from the source lane
                source_item = lane["items"].pop(source_index)
                break

        if not source_item:
            raise HTTPException(status_code=400, detail="Source item not found")

        # Find the target lane and insert the item
        target_found = False
        for lane in kanban_data["lanes"]:
            if lane["title"] == target_lane:
                target_found = True
                # Insert at the specified index or append if out of range
                if 0 <= target_index <= len(lane["items"]):
                    lane["items"].insert(target_index, source_item)
                else:
                    lane["items"].append(source_item)
                break

        # If target lane doesn't exist, create it
        if not target_found:
            kanban_data["lanes"].append({
                "title": target_lane,
                "items": [source_item]
            })

        # Generate updated markdown
        new_content = generate_kanban_md(kanban_data)

        # Save the updated content
        save_file_content(file_path, new_content)

        return {"message": "Item moved successfully", "board": kanban_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to move kanban item: {str(e)}")


@kanban_router.put("/item/{file_path:path}")
async def update_kanban_item(
        file_path: str,
        item_data: Dict[str, Any] = Body(...),
        user: dict = Depends(get_current_user)
):
    """
    Update an existing kanban item (text, completion status, etc.)
    """
    try:
        # Ensure the file path is valid and accessible
        file_path = ensure_valid_path(file_path)
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        # Get the current content and parse it
        content = get_file_content(file_path)
        kanban_data = parse_kanban_md(content)

        # Find the lane and item to update
        lane_title = item_data.get("lane")
        item_index = item_data.get("index")

        for lane in kanban_data["lanes"]:
            if lane["title"] == lane_title and 0 <= item_index < len(lane["items"]):
                # Update the item properties
                item = lane["items"][item_index]

                if "text" in item_data:
                    item["text"] = item_data["text"]
                if "completed" in item_data:
                    item["completed"] = item_data["completed"]
                if "links" in item_data:
                    item["links"] = item_data["links"]
                if "tags" in item_data:
                    item["tags"] = item_data["tags"]

                break

        # Generate updated markdown
        new_content = generate_kanban_md(kanban_data)

        # Save the updated content
        save_file_content(file_path, new_content)

        return {"message": "Item updated successfully", "board": kanban_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update kanban item: {str(e)}")


def setup_kanban_routes(app):
    app.include_router(kanban_router)