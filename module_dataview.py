from fastapi import APIRouter, Depends, HTTPException
import os
import re
import json
import yaml
from typing import List, Dict, Any, Optional
import markdown
from pathlib import Path

from module_auth import get_current_user
from module_file_system import list_files_recursive, get_file_content, ensure_valid_path

dataview_router = APIRouter(prefix="/api/dataview", tags=["dataview"])


def extract_frontmatter(content: str) -> tuple[Dict[str, Any], str]:
    """Extract YAML frontmatter from markdown content"""
    frontmatter = {}
    content_without_frontmatter = content

    # Check for YAML frontmatter
    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            try:
                frontmatter = yaml.safe_load(parts[1])
                content_without_frontmatter = parts[2]
            except yaml.YAMLError:
                pass

    return frontmatter, content_without_frontmatter


def extract_tags(content: str) -> List[str]:
    """Extract tags from markdown content (#tag format)"""
    # Match tags that start with # and are followed by alphanumeric characters or hyphens
    tags = re.findall(r'#([a-zA-Z0-9_-]+)', content)
    return list(set(tags))  # Remove duplicates


def extract_tasks(content: str) -> List[Dict[str, Any]]:
    """Extract tasks from markdown content"""
    tasks = []
    # Match common task formats: - [ ] Task or * [ ] Task
    task_pattern = re.compile(r'^\s*[-*]\s*\[([ xX])\]\s*(.+)$', re.MULTILINE)

    for match in task_pattern.finditer(content):
        completed = match.group(1).strip().lower() == 'x'
        task_text = match.group(2).strip()
        tasks.append({
            "text": task_text,
            "completed": completed
        })

    return tasks


def extract_links(content: str) -> List[Dict[str, str]]:
    """Extract markdown links from content"""
    links = []

    # Match standard markdown links: [text](url)
    standard_links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', content)
    for text, url in standard_links:
        links.append({"text": text, "url": url})

    # Match wiki-style links: [[path]] or [[path|text]]
    wiki_links = re.findall(r'\[\[([^\]]+)\]\]', content)
    for link in wiki_links:
        if '|' in link:
            path, text = link.split('|', 1)
            links.append({"text": text.strip(), "url": path.strip()})
        else:
            links.append({"text": link.strip(), "url": link.strip()})

    return links


def parse_dataview_query(query: str) -> Dict[str, Any]:
    """Parse a dataview query string into components"""
    query_info = {
        "type": "TABLE",  # Default type
        "fields": [],
        "source": "",
        "filters": [],
        "sort": None
    }

    # Extract query type (TABLE, LIST, etc.)
    if "TABLE" in query:
        query_info["type"] = "TABLE"
        # Check for "WITHOUT ID" modifier
        if "WITHOUT ID" in query:
            query_info["without_id"] = True
    elif "LIST" in query:
        query_info["type"] = "LIST"

    # Extract the FROM source
    from_match = re.search(r'FROM\s+(.+?)(?:\s+WHERE|\s+SORT|\s*$)', query, re.DOTALL)
    if from_match:
        query_info["source"] = from_match.group(1).strip()

    # Extract fields for TABLE queries
    if query_info["type"] == "TABLE":
        # Find the section between TABLE and FROM
        fields_section_match = re.search(r'TABLE.*?(?:WITHOUT ID)?\s*\n(.*?)FROM', query, re.DOTALL)
        if fields_section_match:
            fields_text = fields_section_match.group(1).strip()
            # Split by commas, but handle the case where commas are in expressions
            fields = []
            current_field = ""
            paren_level = 0

            for char in fields_text:
                if char == '(' or char == '[':
                    paren_level += 1
                    current_field += char
                elif char == ')' or char == ']':
                    paren_level -= 1
                    current_field += char
                elif char == ',' and paren_level == 0:
                    fields.append(current_field.strip())
                    current_field = ""
                else:
                    current_field += char

            if current_field:
                fields.append(current_field.strip())

            query_info["fields"] = fields

    # Extract WHERE clauses
    where_matches = re.findall(r'WHERE\s+([^WHERE]+?)(?:\s+WHERE|\s+SORT|\s*$)', query, re.DOTALL)
    if where_matches:
        query_info["filters"] = [clause.strip() for clause in where_matches]

    # Extract SORT clause
    sort_match = re.search(r'SORT\s+(.+?)(?:\s*$)', query, re.DOTALL)
    if sort_match:
        query_info["sort"] = sort_match.group(1).strip()

    return query_info


def get_metadata_for_file(file_path: str, root_dir: str) -> Dict[str, Any]:
    """Extract metadata from a markdown file"""
    try:
        file_path = ensure_valid_path(file_path)
        content = get_file_content(file_path)

        # Get file stats
        stats = os.stat(file_path)

        # Extract various metadata
        frontmatter, content_without_fm = extract_frontmatter(content)
        tags = extract_tags(content)
        tasks = extract_tasks(content)
        links = extract_links(content)

        # Create relative path from root dir
        rel_path = os.path.relpath(file_path, root_dir)

        # Basic metadata
        metadata = {
            "file": {
                "path": rel_path,
                "name": os.path.basename(file_path),
                "extension": os.path.splitext(file_path)[1],
                "link": rel_path,
                "size": stats.st_size,
                "ctime": stats.st_ctime,
                "mtime": stats.st_mtime,
                "tasks": tasks
            },
            "frontmatter": frontmatter,
            "tags": tags,
            "links": links
        }

        # Merge frontmatter data with the top level for easier access
        for key, value in frontmatter.items():
            metadata[key] = value

        return metadata
    except Exception as e:
        print(f"Error extracting metadata from {file_path}: {str(e)}")
        return {}


@dataview_router.post("/query")
async def execute_dataview_query(
        query: Dict[str, str],
        user: dict = Depends(get_current_user)
):
    """
    Execute a dataview-like query on the markdown files
    """
    try:
        query_text = query.get("query", "")
        folder_path = query.get("folder", "")

        if not query_text:
            raise HTTPException(status_code=400, detail="Query is required")

        # Ensure folder path is valid
        root_dir = ensure_valid_path(folder_path) if folder_path else os.getcwd()

        # Parse the query
        parsed_query = parse_dataview_query(query_text)

        # Get all markdown files in the directory
        all_files = list_files_recursive(root_dir, [".md"])

        # Process each file to get metadata
        files_metadata = []
        for file_path in all_files:
            metadata = get_metadata_for_file(file_path, root_dir)
            if metadata:
                files_metadata.append(metadata)

        # Apply source filters (FROM clause)
        filtered_files = files_metadata
        if parsed_query["source"]:
            source = parsed_query["source"].lower()
            # Handle tag filtering
            if "#" in source:
                tags = re.findall(r'#([a-zA-Z0-9_-]+)', source)
                if tags:
                    filtered_files = [
                        meta for meta in filtered_files
                        if any(tag.lower() in [t.lower() for t in meta["tags"]] for tag in tags)
                    ]

        # Apply WHERE filters
        for filter_clause in parsed_query.get("filters", []):
            # Handle simple filters - this is a simplified implementation
            if "contains" in filter_clause.lower():
                # Example: contains(file.path, "Template")
                match = re.search(r'contains\(([^,]+),\s*"([^"]+)"\)', filter_clause)
                if match:
                    field_path, value = match.group(1).strip(), match.group(2)

                    # Handle negation
                    negation = "!" in filter_clause and "!" in filter_clause.split("contains")[0]

                    # Filter the files
                    new_filtered = []
                    for meta in filtered_files:
                        # Navigate the field path (e.g., "file.path")
                        parts = field_path.split('.')
                        current = meta
                        found = True
                        for part in parts:
                            if part in current:
                                current = current[part]
                            else:
                                found = False
                                break

                        # Apply the filter
                        if found:
                            contains = str(value).lower() in str(current).lower()
                            if (not negation and contains) or (negation and not contains):
                                new_filtered.append(meta)

                    filtered_files = new_filtered

        # Apply sorting if specified
        if parsed_query.get("sort"):
            sort_clause = parsed_query["sort"]
            desc = "DESC" in sort_clause
            # Extract the field to sort by (simplified implementation)
            field_match = re.search(r'([\w.]+)', sort_clause)
            if field_match:
                sort_field = field_match.group(1)
                try:
                    filtered_files.sort(
                        key=lambda x: get_nested_value(x, sort_field),
                        reverse=desc
                    )
                except (KeyError, TypeError):
                    # If sort field doesn't exist in some items, ignore sorting
                    pass

        # Format the result based on query type
        if parsed_query["type"] == "TABLE":
            result = {
                "type": "table",
                "headers": parsed_query["fields"] if parsed_query["fields"] else ["File"],
                "rows": []
            }

            # Process each file to extract the requested fields
            for meta in filtered_files:
                row = []
                for field_expr in parsed_query["fields"]:
                    # Handle expressions like: link(file.link, title) as Title
                    as_match = re.search(r'(.*?)\s+as\s+(\w+)', field_expr)
                    if as_match:
                        field_expr = as_match.group(1)

                    # Extract the field value (this is simplified)
                    try:
                        # Handle basic field paths (e.g., file.name)
                        if re.match(r'^[\w.]+$', field_expr):
                            value = get_nested_value(meta, field_expr)
                        else:
                            # For more complex expressions, we'd need a proper expression parser
                            # This is a simplified approach for demo purposes
                            value = evaluate_expression(field_expr, meta)
                        row.append(value)
                    except Exception as e:
                        row.append(f"Error: {str(e)}")

                result["rows"].append(row)
        else:
            # Default to returning the filtered metadata
            result = {
                "type": "list",
                "items": filtered_files
            }

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dataview query failed: {str(e)}")


def get_nested_value(data: Dict[str, Any], path: str) -> Any:
    """Get a value from a nested dictionary using dot notation"""
    parts = path.split('.')
    current = data
    for part in parts:
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return None
    return current


def evaluate_expression(expr: str, data: Dict[str, Any]) -> Any:
    """Evaluate a simple dataview expression (highly simplified)"""
    # Handle link function: link(file.link, title)
    link_match = re.search(r'link\(([^,]+),\s*([^)]+)\)', expr)
    if link_match:
        url_path = link_match.group(1).strip()
        text_path = link_match.group(2).strip()

        url = get_nested_value(data, url_path)
        text = get_nested_value(data, text_path)

        return {"type": "link", "url": url, "text": text}

    # Handle choice function: choice(Tasks.completed, "🟢", "❌")
    choice_match = re.search(r'choice\(([^,]+),\s*"([^"]+)",\s*"([^"]+)"\)', expr)
    if choice_match:
        condition_path = choice_match.group(1).strip()
        true_value = choice_match.group(2)
        false_value = choice_match.group(3)

        condition_value = get_nested_value(data, condition_path)
        return true_value if condition_value else false_value

    # Default to returning the expression as-is
    return expr


def setup_dataview_routes(app):
    app.include_router(dataview_router)