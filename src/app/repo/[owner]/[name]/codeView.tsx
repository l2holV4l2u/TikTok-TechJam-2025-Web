import { fileContentAtom, selectedFileAtom } from "@/lib/atom/repoAtom";
import { useAtomValue } from "jotai";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

export function CodeView() {
  const selectedFile = useAtomValue(selectedFileAtom);
  const fileContent = useAtomValue(fileContentAtom);
  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 p-3 flex-shrink-0">
        <h3 className="font-medium text-gray-900">{selectedFile}</h3>
      </div>
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          style={oneLight}
          language="kotlin"
          PreTag="div"
          className="text-sm h-full"
          showLineNumbers={true}
          wrapLines={true}
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "#fafafa",
            height: "100%",
            overflow: "auto",
          }}
        >
          {fileContent}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
