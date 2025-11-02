import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./PdfViewer.css";

// Set up PDF.js worker - use local file instead of CDN for Tauri
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerProps {
  pdfData: Uint8Array | null;
  error: string | null;
}

// Helper function to convert Uint8Array to base64 data URL
const arrayBufferToBase64 = (buffer: Uint8Array): string => {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return `data:application/pdf;base64,${window.btoa(binary)}`;
};

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfData, error }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(3.0, prev + 0.2));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(0.5, prev - 0.2));
  };

  const resetZoom = () => {
    setScale(1.0);
  };

  return (
    <div className="pdf-viewer-container">
      <div className="pdf-toolbar">
        <span className="pdf-title">PDF Preview</span>
        {pdfData && (
          <div className="pdf-controls">
            <div className="zoom-controls">
              <button onClick={zoomOut} className="control-btn" title="Zoom Out">
                -
              </button>
              <span className="zoom-level">{Math.round(scale * 100)}%</span>
              <button onClick={zoomIn} className="control-btn" title="Zoom In">
                +
              </button>
              <button onClick={resetZoom} className="control-btn" title="Reset Zoom">
                Reset
              </button>
            </div>
            {numPages > 1 && (
              <div className="page-controls">
                <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="control-btn">
                  ←
                </button>
                <span className="page-info">
                  Page {pageNumber} of {numPages}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={pageNumber >= numPages}
                  className="control-btn"
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pdf-content" ref={containerRef}>
        {error && (
          <div className="error-message">
            <h3>Compilation Error</h3>
            <pre>{error}</pre>
          </div>
        )}

        {!error && !pdfData && (
          <div className="placeholder">
            <p>Compiling LaTeX document...</p>
          </div>
        )}

        {!error && pdfData && (
          <div className="pdf-document-wrapper">
            <Document
              file={arrayBufferToBase64(pdfData)}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="placeholder">
                  <p>Loading PDF...</p>
                </div>
              }
              error={
                <div className="error-message">
                  <h3>Failed to load PDF</h3>
                  <p>The PDF could not be rendered.</p>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
