import { useEffect, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import { latex } from "codemirror-lang-latex";
import { invoke } from "@tauri-apps/api/core";
import "./LatexEditor.css";

interface LatexEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  onCompile: (pdf: Uint8Array) => void;
  onError: (error: string) => void;
}

const LatexEditor: React.FC<LatexEditorProps> = ({
  initialContent,
  onChange,
  onCompile,
  onError,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [currentContent, setCurrentContent] = useState(initialContent);

  useEffect(() => {
    if (!editorRef.current) return;

    // Wait for Tauri to be ready before compiling
    const checkTauriReady = () => {
      return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined;
    };

    // Check if user prefers dark mode
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    const startState = EditorState.create({
      doc: initialContent,
      extensions: [
        latex(),
        syntaxHighlighting(defaultHighlightStyle),
        lineNumbers(),
        history(),
        bracketMatching(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const content = update.state.doc.toString();
            setCurrentContent(content);
            onChange(content);
          }
        }),
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto" },
        }),
        ...(prefersDark ? [oneDark] : []),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  const compileLatex = async () => {
    setIsCompiling(true);
    try {
      // Check if Tauri is available
      if (typeof window !== 'undefined' && !window.__TAURI_INTERNALS__) {
        throw new Error("Tauri API not available. Make sure you're running in Tauri context.");
      }

      const pdfBytes = await invoke<number[]>("compile_latex", {
        source: currentContent,
      });

      // Convert number array to Uint8Array
      const pdfData = new Uint8Array(pdfBytes);
      onCompile(pdfData);
    } catch (error) {
      console.error("LaTeX compilation error:", error);
      onError(String(error));
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="latex-editor-container">
      <div className="editor-toolbar">
        <span className="editor-title">LaTeX Editor</span>
        <div className="toolbar-actions">
          {isCompiling && <span className="compiling-indicator">Compiling...</span>}
          <button
            className="compile-button"
            onClick={compileLatex}
            disabled={isCompiling}
          >
            {isCompiling ? "Compiling..." : "Compile"}
          </button>
        </div>
      </div>
      <div ref={editorRef} className="editor-wrapper" />
    </div>
  );
};

export default LatexEditor;
