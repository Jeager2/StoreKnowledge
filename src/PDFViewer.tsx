import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface PDFViewerProps {
  markdownContent: string;
  fileName?: string;
  onClose: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ markdownContent, fileName = 'document', onClose }) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1.0);
  const [showToolbar, setShowToolbar] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generatePDF();

    return () => {
      // Cleanup URL when component unmounts
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [markdownContent]);

  const generatePDF = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await axios.post('/api/export/pdf', {
        markdown: markdownContent,
        fileName: fileName
      }, {
        responseType: 'blob'
      });

      // Create a URL for the blob
      const url = URL.createObjectURL(response.data);
      setPdfUrl(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;

    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `${fileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.1, 2.0));
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.1, 0.5));
  };

  const handleZoomReset = () => {
    setScale(1.0);
  };

  const handlePrint = () => {
    if (!pdfUrl) return;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = pdfUrl;

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
      }, 100);
    };

    document.body.appendChild(iframe);
  };

  const toggleToolbar = () => {
    setShowToolbar(!showToolbar);
  };

  const renderToolbar = () => {
    if (!showToolbar) {
      return (
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={toggleToolbar}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full"
            title="Show toolbar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"/>
              <circle cx="19" cy="12" r="1"/>
              <circle cx="5" cy="12" r="1"/>
            </svg>
          </button>
        </div>
      );
    }

    return (
      <div className="bg-gray-100 p-2 border-b flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="p-2 bg-white hover:bg-gray-200 rounded"
            title="Zoom out"
            disabled={isGenerating}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>

          <span className="text-sm">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            className="p-2 bg-white hover:bg-gray-200 rounded"
            title="Zoom in"
            disabled={isGenerating}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>

          <button
            onClick={handleZoomReset}
            className="p-2 bg-white hover:bg-gray-200 rounded"
            title="Reset zoom"
            disabled={isGenerating}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={generatePDF}
            className="p-2 bg-white hover:bg-gray-200 rounded"
            title="Refresh PDF"
            disabled={isGenerating}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6"/>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
              <path d="M3 22v-6h6"/>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
          </button>

          <button
            onClick={handlePrint}
            className="p-2 bg-white hover:bg-gray-200 rounded"
            title="Print"
            disabled={isGenerating || !pdfUrl}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
          </button>

          <button
            onClick={handleDownload}
            className="p-2 bg-white hover:bg-gray-200 rounded"
            title="Download PDF"
            disabled={isGenerating || !pdfUrl}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>

          <button
            onClick={toggleToolbar}
            className="p-2 bg-white hover:bg-gray-200 rounded"
            title="Hide toolbar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"/>
              <circle cx="19" cy="12" r="1"/>
              <circle cx="5" cy="12" r="1"/>
            </svg>
          </button>

          <button
            onClick={onClose}
            className="p-2 bg-white hover:bg-gray-200 rounded"
            title="Close viewer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-5/6 flex flex-col overflow-hidden">
        {renderToolbar()}

        <div ref={containerRef} className="flex-1 overflow-auto p-4 bg-gray-200 relative">
          {isGenerating ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-4 text-gray-700">Generating PDF...</p>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
                <div className="text-red-500 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Error</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={generatePDF}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : pdfUrl ? (
            <div className="flex justify-center min-h-full">
              <iframe
                src={`${pdfUrl}#view=FitH&zoom=${scale}`}
                className="w-full h-full border-0 bg-white shadow-lg"
                style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
                title="PDF Viewer"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;