import { useEffect, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import { latex } from "codemirror-lang-latex";
import { invoke } from "@tauri-apps/api/core";

interface LatexEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  onCompile: (pdf: Uint8Array) => void;
  onError: (error: string) => void;
  projectPath: string | null;
  filePath: string | null;
}

const LatexEditor: React.FC<LatexEditorProps> = ({
  initialContent,
  onChange,
  onCompile,
  onError,
  projectPath,
  filePath,
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

  // Update editor content when initialContent changes (e.g., when loading a new file)
  useEffect(() => {
    if (viewRef.current && initialContent !== currentContent) {
      const view = viewRef.current;
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: initialContent,
        },
      });
      setCurrentContent(initialContent);
    }
  }, [initialContent]);

  const compileLatex = async () => {
    if (!projectPath || !filePath) {
      onError("No project or file is open. Please open a project first.");
      return;
    }

    setIsCompiling(true);
    try {
      // Check if Tauri is available
      if (typeof window !== 'undefined' && !window.__TAURI_INTERNALS__) {
        throw new Error("Tauri API not available. Make sure you're running in Tauri context.");
      }

      // Use project-based compilation
      const pdfBytes = await invoke<number[]>("compile_latex_project", {
        projectPath,
        filePath,
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
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 text-sm">
        <span className="font-semibold text-gray-800 dark:text-gray-300">LaTeX Editor</span>
        <div className="flex items-center gap-3">
          {isCompiling && <span className="text-blue-600 dark:text-cyan-500 text-xs animate-pulse">Compiling...</span>}
          <button
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white border-none rounded text-[13px] font-medium cursor-pointer transition-colors disabled:bg-blue-400 dark:disabled:bg-cyan-400 disabled:cursor-not-allowed"
            onClick={compileLatex}
            disabled={isCompiling}
          >
            {isCompiling ? "Compiling..." : "Compile"}
          </button>
        </div>
      </div>
      <div ref={editorRef} className="flex-1 overflow-hidden [&_.cm-editor]:h-full [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-sm [&_.cm-scroller]:leading-relaxed" />
    </div>
  );
};

export default LatexEditor;
