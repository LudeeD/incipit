import { useEffect, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers, keymap } from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
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

    // Check if user prefers dark mode
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

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

  const insertLatexCommand = (before: string, after: string = "") => {
    if (!viewRef.current) return;

    const view = viewRef.current;
    const { from, to } = view.state.selection.main;
    const selectedText = view.state.doc.sliceString(from, to);

    view.dispatch({
      changes: {
        from,
        to,
        insert: before + selectedText + after,
      },
      selection: {
        anchor: from + before.length,
        head: from + before.length + selectedText.length,
      },
    });

    view.focus();
  };

  const compileLatex = async () => {
    if (!projectPath || !filePath) {
      onError("No project or file is open. Please open a project first.");
      return;
    }

    setIsCompiling(true);
    try {
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
    <div className="flex flex-col h-full ">
      <div className="flex justify-between items-center px-3 py-1.5 text-sm">
        <div className="flex items-center gap-2">
          <div className="flex">
            <button
              onClick={() => insertLatexCommand("\\textbf{", "}")}
              className="px-3 py-1 text-[13px] font-bold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-300 transition-colors"
              title="Bold"
            >
              B
            </button>
            <button
              onClick={() => insertLatexCommand("\\textit{", "}")}
              className="px-3 py-1 text-[13px] italic bg-white dark:bg-gray-700 border-t border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-300 transition-colors"
              title="Italic"
            >
              I
            </button>
            <button
              onClick={() => insertLatexCommand("\\underline{", "}")}
              className="px-3 py-1 text-[13px] underline bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-r hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-300 transition-colors"
              title="Underline"
            >
              U
            </button>
          </div>
          <button
            onClick={() => insertLatexCommand("\\section{", "}")}
            className="px-3 py-1 text-[13px] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-300 transition-colors"
            title="Section"
          >
            §
          </button>
          <button
            onClick={() =>
              insertLatexCommand(
                "\\begin{itemize}\n  \\item ",
                "\n\\end{itemize}",
              )
            }
            className="px-3 py-1 text-[13px] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-300 transition-colors"
            title="List"
          >
            •
          </button>
          <button
            onClick={() => insertLatexCommand("$", "$")}
            className="px-3 py-1 text-[13px] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-300 transition-colors"
            title="Inline Math"
          >
            $
          </button>
        </div>
        <div className="flex items-center gap-2">
          {isCompiling && (
            <span className="text-blue-600 dark:text-cyan-500 text-xs animate-pulse">
              Compiling...
            </span>
          )}
          <button
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white border-none rounded text-[13px] font-medium cursor-pointer transition-colors disabled:bg-blue-400 dark:disabled:bg-cyan-400 disabled:cursor-not-allowed"
            onClick={compileLatex}
            disabled={isCompiling}
          >
            {isCompiling ? "Compiling..." : "Compile"}
          </button>
        </div>
      </div>
      <div
        ref={editorRef}
        className=" bg-white dark:bg-gray-900 flex-1 overflow-hidden [&_.cm-editor]:h-full [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-[14px] [&_.cm-scroller]:leading-relaxed [&_.cm-scroller]:antialiased"
      />
    </div>
  );
};

export default LatexEditor;
