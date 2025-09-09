import { DependencyGraphProps } from "@/types/graphTypes";
import { RepoClientProps } from "@/types/repoTypes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileNode } from "@/lib/tree";
import { ChevronRight, PanelLeft } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import { FileTab } from "./fileTab";
import { AnalysisTab } from "./analysisTab";
import { AITab } from "./aiTab";

export function Sidebar({
  loading,
  fileTree,
  owner,
  name,
  setGraph,
  setLoadingAnalysis,
  selectedPaths,
  setSelectedPaths,
  graph,
  onShowComparison,
}: {
  loading: boolean;
  fileTree: FileNode[];
  setGraph: Dispatch<SetStateAction<DependencyGraphProps | null>>;
  setLoadingAnalysis: Dispatch<SetStateAction<boolean>>;
  selectedPaths: Set<string>;
  setSelectedPaths: Dispatch<SetStateAction<Set<string>>>;
  graph: DependencyGraphProps | null;
  onShowComparison?: (result: any) => void;
} & RepoClientProps) {
  const [isFileTreeCollapsed, setIsFileTreeCollapsed] = useState(false);
  const toggleFileTree = () => {
    setIsFileTreeCollapsed(!isFileTreeCollapsed);
  };

  return (
    <>
      {/* File Tree Sidebar */}
      <div
        className={`relative transition-all duration-300 ease-in-out flex-shrink-0 ${
          isFileTreeCollapsed ? "w-0" : "w-md"
        }`}
      >
        <div
          className={`h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex ${
            isFileTreeCollapsed
              ? "opacity-0 pointer-events-none -translate-x-full"
              : "opacity-100"
          }`}
        >
          <Tabs defaultValue="files" className="flex-1 flex flex-col min-h-0">
            {/* Sidebar Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <div className="flex items-center p-4 border-b border-gray-100 justify-between flex-shrink-0">
                <TabsList className="border-b border-gray-100 flex-shrink-0 w-90">
                  <TabsTrigger value="files" className="flex-1 text-sm">
                    Files
                  </TabsTrigger>
                  <TabsTrigger value="analysis" className="flex-1 text-sm">
                    Analysis
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="flex-1 text-sm">
                    AI
                  </TabsTrigger>
                </TabsList>
                <button
                  onClick={toggleFileTree}
                  className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                >
                  <PanelLeft size={18} />
                </button>
              </div>

              <TabsContent value="files" className="flex-1 min-h-0">
                <FileTab
                  loading={loading}
                  fileTree={fileTree}
                  owner={owner}
                  name={name}
                  setGraph={setGraph}
                  setLoadingAnalysis={setLoadingAnalysis}
                  selectedPaths={selectedPaths}
                  setSelectedPaths={setSelectedPaths}
                />
              </TabsContent>
              <TabsContent value="analysis" className="flex-1 min-h-0">
                <AnalysisTab />
              </TabsContent>
              <TabsContent value="ai" className="flex-1 min-h-0">
                <AITab
                  owner={owner}
                  name={name}
                  graph={graph}
                  onShowComparison={onShowComparison}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Full Height Toggle Bar - Hidden */}
      {isFileTreeCollapsed && (
        <div
          className="w-6 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors flex items-center justify-center group border-r border-gray-200"
          onClick={toggleFileTree}
        >
          <ChevronRight className="w-16 h-16" />
        </div>
      )}
    </>
  );
}
