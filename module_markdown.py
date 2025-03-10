"""
Markdown processing module for the Markdown Editor.
Handles rendering Markdown to HTML and other markdown-related operations.
"""
import re
from typing import List, Optional, Dict, Any
import markdown
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from module_auth import get_current_user, User

# Router setup
markdown_router = APIRouter()


# Model definitions
class MarkdownContent(BaseModel):
    content: str


class MarkdownResult(BaseModel):
    html: str
    toc: Optional[List[Dict[str, Any]]] = None


class TocItem(BaseModel):
    id: str
    text: str
    level: int


# Setup markdown extensions
MARKDOWN_EXTENSIONS = [
    'markdown.extensions.extra',  # tables, footnotes, etc.
    'markdown.extensions.codehilite',  # code highlighting
    'markdown.extensions.toc',  # table of contents
    'markdown.extensions.wikilinks',  # [[WikiLinks]]
    'markdown.extensions.nl2br',  # newlines to <br>
    'markdown.extensions.sane_lists',  # better list handling
]

EXTENSION_CONFIGS = {
    'markdown.extensions.codehilite': {
        'linenums': False,
        'use_pygments': True
    },
    'markdown.extensions.toc': {
        'baselevel': 1,
        'permalink': True
    }
}


# Helper function to extract TOC
def extract_toc(html: str) -> List[Dict[str, Any]]:
    """Extract table of contents from HTML with heading IDs"""
    toc = []
    # Find all headings with IDs
    heading_pattern = re.compile(r'<h([1-6]) id="([^"]+)">(.+?)</h\1>')

    for match in heading_pattern.finditer(html):
        level = int(match.group(1))
        id = match.group(2)
        # Remove any HTML tags from the heading text
        text = re.sub(r'<[^>]+>', '', match.group(3))

        toc.append({
            "id": id,
            "text": text,
            "level": level
        })

    return toc


# Routes
@markdown_router.post("/render", response_model=MarkdownResult)
async def render_markdown(content: MarkdownContent, current_user: User = Depends(get_current_user)):
    """Render markdown content to HTML"""
    try:
        # Process mermaid blocks separately
        content_with_mermaid_placeholders = []
        mermaid_blocks = []

        lines = content.content.split('\n')
        in_mermaid_block = False
        current_mermaid_block = []
        mermaid_count = 0

        for line in lines:
            if line.strip() == '```mermaid':
                in_mermaid_block = True
                current_mermaid_block = []
                content_with_mermaid_placeholders.append(f'<!--MERMAID_PLACEHOLDER_{mermaid_count}-->')
            elif in_mermaid_block and line.strip() == '```':
                in_mermaid_block = False
                mermaid_blocks.append('\n'.join(current_mermaid_block))
                mermaid_count += 1
            elif in_mermaid_block:
                current_mermaid_block.append(line)
            else:
                content_with_mermaid_placeholders.append(line)

        # Convert markdown to HTML
        md = markdown.Markdown(extensions=MARKDOWN_EXTENSIONS, extension_configs=EXTENSION_CONFIGS)
        html = md.convert('\n'.join(content_with_mermaid_placeholders))

        # Replace mermaid placeholders with mermaid divs
        for i, mermaid_content in enumerate(mermaid_blocks):
            html = html.replace(
                f'<!--MERMAID_PLACEHOLDER_{i}-->',
                f'<div class="mermaid">\n{mermaid_content}\n</div>'
            )

        # Extract TOC
        toc = extract_toc(html)

        return {
            "html": html,
            "toc": toc
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to render markdown: {str(e)}"
        )


@markdown_router.post("/preview", response_model=MarkdownResult)
async def preview_markdown(content: MarkdownContent):
    """Preview markdown without authentication"""
    try:
        md = markdown.Markdown(extensions=MARKDOWN_EXTENSIONS, extension_configs=EXTENSION_CONFIGS)
        html = md.convert(content.content)

        # Extract TOC
        toc = extract_toc(html)

        return {
            "html": html,
            "toc": toc
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to render markdown: {str(e)}"
        )