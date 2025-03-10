from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import FileResponse
import os
import tempfile
import markdown
import pdfkit
from pathlib import Path
from typing import Optional

from module_auth import get_current_user
from module_file_system import get_file_content, ensure_valid_path

pdf_router = APIRouter(prefix="/api/pdf", tags=["pdf"])

# Configuration for PDF generation with wkhtmltopdf
PDF_OPTIONS = {
    'page-size': 'A4',
    'margin-top': '0.75in',
    'margin-right': '0.75in',
    'margin-bottom': '0.75in',
    'margin-left': '0.75in',
    'encoding': "UTF-8",
    'no-outline': None,
    'enable-local-file-access': None
}

# CSS for PDF styling
PDF_CSS = """
body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    margin: 0;
    padding: 0;
    color: #333;
}
h1, h2, h3, h4, h5, h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
}
h1 { font-size: 2em; }
h2 { font-size: 1.75em; }
h3 { font-size: 1.5em; }
h4 { font-size: 1.25em; }
h5 { font-size: 1em; }
h6 { font-size: 0.85em; }
a { color: #0366d6; text-decoration: none; }
pre {
    background-color: #f6f8fa;
    border-radius: 3px;
    padding: 12px;
    overflow: auto;
}
code {
    font-family: 'Courier New', Courier, monospace;
    background-color: rgba(27, 31, 35, 0.05);
    border-radius: 3px;
    padding: 0.2em 0.4em;
}
img { max-width: 100%; }
table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1em;
}
table, th, td {
    border: 1px solid #ddd;
}
th, td {
    padding: 8px 12px;
    text-align: left;
}
th { background-color: #f2f2f2; }
blockquote {
    margin: 0;
    padding-left: 1em;
    border-left: 4px solid #ddd;
    color: #555;
}
ul, ol { padding-left: 2em; }
hr {
    border: none;
    height: 1px;
    background-color: #ddd;
    margin: 1em 0;
}
.task-list-item {
    list-style-type: none;
}
.task-list-item input {
    margin-right: 0.5em;
}
"""


@pdf_router.get("/export/{file_path:path}")
async def export_to_pdf(
        file_path: str,
        user: dict = Depends(get_current_user)
):
    """
    Convert a markdown file to PDF and return it as a download
    """
    try:
        # Ensure the file path is valid and accessible
        file_path = ensure_valid_path(file_path)
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        # Get the markdown content
        content = get_file_content(file_path)

        # Convert markdown to HTML
        html_content = markdown.markdown(
            content,
            extensions=[
                'extra',
                'codehilite',
                'tables',
                'toc',
                'fenced_code',
                'nl2br',
                'md_in_html',
                'sane_lists'
            ]
        )

        # Add CSS and create complete HTML document
        complete_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{os.path.basename(file_path)}</title>
            <style>
                {PDF_CSS}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """

        # Create temporary files for the HTML and PDF
        with tempfile.NamedTemporaryFile(suffix='.html', delete=False) as html_temp:
            html_temp.write(complete_html.encode('utf-8'))
            html_temp_path = html_temp.name

        pdf_temp_path = html_temp_path.replace('.html', '.pdf')

        # Convert HTML to PDF
        pdfkit.from_file(html_temp_path, pdf_temp_path, options=PDF_OPTIONS)

        # Clean up the temporary HTML file
        if os.path.exists(html_temp_path):
            os.unlink(html_temp_path)

        # Get filename from the original path
        filename = os.path.basename(file_path).replace('.md', '.pdf')

        # Return the PDF file
        return FileResponse(
            path=pdf_temp_path,
            filename=filename,
            media_type="application/pdf",
            background=None  # No background task to remove the file afterwards
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


def setup_pdf_routes(app):
    app.include_router(pdf_router)