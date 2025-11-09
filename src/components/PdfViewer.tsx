import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

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
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 text-sm flex-wrap gap-2">
        <span className="font-semibold text-gray-800 dark:text-gray-300">PDF Preview</span>
        {pdfData && (
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <button onClick={zoomOut} className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded cursor-pointer text-[13px] transition-all hover:bg-blue-500 hover:text-white hover:border-blue-500 dark:hover:bg-cyan-500 dark:hover:border-cyan-500 dark:text-gray-300" title="Zoom Out">
                -
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
              <button onClick={zoomIn} className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded cursor-pointer text-[13px] transition-all hover:bg-blue-500 hover:text-white hover:border-blue-500 dark:hover:bg-cyan-500 dark:hover:border-cyan-500 dark:text-gray-300" title="Zoom In">
                +
              </button>
              <button onClick={resetZoom} className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded cursor-pointer text-[13px] transition-all hover:bg-blue-500 hover:text-white hover:border-blue-500 dark:hover:bg-cyan-500 dark:hover:border-cyan-500 dark:text-gray-300" title="Reset Zoom">
                Reset
              </button>
            </div>
            {numPages > 1 && (
              <div className="flex items-center gap-2">
                <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded cursor-pointer text-[13px] transition-all hover:bg-blue-500 hover:text-white hover:border-blue-500 dark:hover:bg-cyan-500 dark:hover:border-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed dark:text-gray-300">
                  ←
                </button>
                <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
                  Page {pageNumber} of {numPages}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={pageNumber >= numPages}
                  className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded cursor-pointer text-[13px] transition-all hover:bg-blue-500 hover:text-white hover:border-blue-500 dark:hover:bg-cyan-500 dark:hover:border-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed dark:text-gray-300"
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto flex justify-center items-start p-5" ref={containerRef}>
        {error && (
          <div className="flex flex-col items-center justify-center p-10 text-center text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg max-w-2xl">
            <h3 className="mb-3 text-base font-semibold">Compilation Error</h3>
            <pre className="text-left bg-red-100 dark:bg-red-900 p-3 rounded overflow-x-auto text-xs max-w-full whitespace-pre-wrap break-words">{error}</pre>
          </div>
        )}

        {!error && !pdfData && (
          <div className="flex flex-col items-center justify-center p-10 text-center text-gray-600 dark:text-gray-400">
            <p className="text-sm">Compiling LaTeX document...</p>
          </div>
        )}

        {!error && pdfData && (
          <div className="shadow-lg bg-white">
            <Document
              file={arrayBufferToBase64(pdfData)}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex flex-col items-center justify-center p-10 text-center text-gray-600 dark:text-gray-400">
                  <p className="text-sm">Loading PDF...</p>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center p-10 text-center text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg max-w-2xl">
                  <h3 className="mb-3 text-base font-semibold">Failed to load PDF</h3>
                  <p className="text-sm">The PDF could not be rendered.</p>
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
