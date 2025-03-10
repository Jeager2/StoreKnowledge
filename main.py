"""
Main FastAPI application entry point.
This is the main file that serves as the entry point for your application.
"""
import os
from pathlib import Path
import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Import routers from modules
from module_auth import auth_router, get_current_user
from module_file_system import file_router
from module_markdown import markdown_router
from module_pdf import pdf_router
from module_dataview import dataview_router
from module_kanban import kanban_router
from search_router import search_router

# Create FastAPI app
app = FastAPI(title="Markdown Editor API",
              description="API for web-based Markdown editor with file system, authentication, and special features",
              version="1.0.0")

# Set up CORS
origins = [
    "http://localhost",
    "http://localhost:3000",  # React development server
    "http://localhost:8000",  # FastAPI server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(file_router, prefix="/api/files", tags=["File System"])
app.include_router(markdown_router, prefix="/api/markdown", tags=["Markdown"])
app.include_router(pdf_router, prefix="/api/pdf", tags=["PDF"])
app.include_router(dataview_router, prefix="/api/dataview", tags=["DataView"])
app.include_router(kanban_router, prefix="/api/kanban", tags=["Kanban"])
app.include_router(search_router, prefix="/api/search", tags=["Search"])

# Define base directory
BASE_DIR = Path(__file__).resolve().parent

# Mount static files
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Serve index.html for all routes not matched by API
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    """Serve the single page application for any unmatched routes"""
    index_path = os.path.join(BASE_DIR, "static", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        raise HTTPException(status_code=404, detail="File not found")

# Root endpoint
@app.get("/", include_in_schema=False)
async def root():
    """Redirect to index.html"""
    return FileResponse(os.path.join(BASE_DIR, "static", "index.html"))

# Health check endpoint
@app.get("/api/health", tags=["Health"])
async def health_check():
    """Check if the API is running"""
    return {"status": "ok"}

if __name__ == "__main__":
    # Run the application with uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # For development
        log_level="info"
    )