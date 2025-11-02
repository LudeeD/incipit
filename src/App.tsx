import { useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import LatexEditor from "./components/LatexEditor";
import PdfViewer from "./components/PdfViewer";
import "./App.css";

const DEFAULT_LATEX = `\\documentclass{article}
\\usepackage[utf8]{inputenc}

\\title{Welcome to Incipit}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}

This is a simple LaTeX document. Start editing to see live updates!

\\subsection{Features}
\\begin{itemize}
    \\item Live PDF preview
    \\item Syntax highlighting
    \\item Resizable panels
\\end{itemize}

\\end{document}`;

function App() {
  const [latexContent, setLatexContent] = useState(DEFAULT_LATEX);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [compilationError, setCompilationError] = useState<string | null>(null);

  const handleLatexChange = (content: string) => {
    setLatexContent(content);
  };

  const handleCompile = async (pdf: Uint8Array) => {
    setPdfData(pdf);
    setCompilationError(null);
  };

  const handleError = (error: string) => {
    setCompilationError(error);
  };

  return (
    <div className="app-container">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={50} minSize={30}>
          <LatexEditor
            initialContent={latexContent}
            onChange={handleLatexChange}
            onCompile={handleCompile}
            onError={handleError}
          />
        </Panel>
        <PanelResizeHandle className="resize-handle" />
        <Panel defaultSize={50} minSize={30}>
          <PdfViewer pdfData={pdfData} error={compilationError} />
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default App;
