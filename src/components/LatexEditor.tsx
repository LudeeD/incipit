import { useEffect, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
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
  const compileTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        lineNumbers(),
        history(),
        bracketMatching(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const content = update.state.doc.toString();
            onChange(content);

            // Debounce compilation: wait 500ms after user stops typing
            if (compileTimeoutRef.current) {
              clearTimeout(compileTimeoutRef.current);
            }

            compileTimeoutRef.current = setTimeout(() => {
              compileLatex(content);
            }, 500);
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

    // Compile initial content after Tauri is ready
    if (checkTauriReady()) {
      compileLatex(initialContent);
    } else {
      // Wait a bit for Tauri to initialize
      setTimeout(() => {
        if (checkTauriReady()) {
          compileLatex(initialContent);
        }
      }, 100);
    }

    return () => {
      view.destroy();
      if (compileTimeoutRef.current) {
        clearTimeout(compileTimeoutRef.current);
      }
    };
  }, []);

  const compileLatex = async (content: string) => {
    setIsCompiling(true);
    try {
      // Check if Tauri is available
      if (typeof window !== 'undefined' && !window.__TAURI_INTERNALS__) {
        throw new Error("Tauri API not available. Make sure you're running in Tauri context.");
      }

      const pdfBytes = await invoke<number[]>("compile_latex", {
        source: content,
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
        {isCompiling && <span className="compiling-indicator">Compiling...</span>}
      </div>
      <div ref={editorRef} className="editor-wrapper" />
    </div>
  );
};

export default LatexEditor;
