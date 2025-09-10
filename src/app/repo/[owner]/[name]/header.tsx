"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  FolderGit2,
  Github,
  Network,
  SquareDashedMousePointer,
  Code,
  GitBranch,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  fileContentAtom,
  loadingAnalysisAtom,
  ownerAtom,
  repoNameAtom,
  selectedFileAtom,
  selectedPathsAtom,
} from "@/lib/atom/repoAtom";
import { isCodeViewAtom } from "@/lib/atom/repoAtom";
import { analyzeRepository, analyzeSelected } from "@/utils/graphUtils";
import {
  graphAtom,
  inputEdgesAtom,
  inputNodesAtom,
} from "@/lib/atom/graphAtom";

export function Header() {
  const [loadingAnalysis, setLoadingAnalysis] = useAtom(loadingAnalysisAtom);
  const [isCodeView, setIsCodeView] = useAtom(isCodeViewAtom);
  const selectedPaths = useAtomValue(selectedPathsAtom);
  const setSelectedFile = useSetAtom(selectedFileAtom);
  const setInputNodes = useSetAtom(inputNodesAtom);
  const setInputEdges = useSetAtom(inputEdgesAtom);
  const setFileContent = useSetAtom(fileContentAtom);
  const setGraph = useSetAtom(graphAtom);
  const owner = useAtomValue(ownerAtom);
  const repoName = useAtomValue(repoNameAtom);
  const repoFullName = `${owner}/${repoName}`;

  return (
    <header className="bg-white border-b border-gray-200 p-4 w-full">
      <div className="relative flex items-center justify-between">
        {/* Left side */}
        <div className="flex gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div className="flex gap-2 items-center">
            <Github size={18} className="text-gray-800" />
            <a
              href={`https://github.com/${repoFullName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline flex items-center gap-2 font-medium"
            >
              {repoFullName}
              <ExternalLink size={16} className="text-gray-800" />
            </a>
          </div>
        </div>

        {/* Center - View Toggle (absolutely positioned) */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-gray-50 rounded-lg p-1 border">
          <button
            onClick={() => {
              if (isCodeView) {
                setIsCodeView(false);
                setSelectedFile(null);
                setFileContent("");
              }
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
              !isCodeView
                ? "bg-white text-purple-500 shadow-sm border"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <GitBranch size={16} /> Graph
          </button>
          <button
            onClick={() => {
              if (!isCodeView) {
                setIsCodeView(true);
                setSelectedFile(null);
                setFileContent("");
              }
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-al cursor-pointer ${
              isCodeView
                ? "bg-white text-purple-500 shadow-sm border"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <Code className="w-4 h-4" /> Code
          </button>
        </div>

        {/* Right side */}
        <div className="flex gap-2 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={loadingAnalysis}
                className="gap-2"
              >
                <Network className="w-4 h-4" />
                {loadingAnalysis ? "Analyzing..." : "Analyze"}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={async () => {
                  setLoadingAnalysis(true);
                  const analysis = await analyzeRepository(owner, repoName);
                  if (analysis.nodes && analysis.edges) {
                    setGraph({
                      nodes: analysis.nodes,
                      edges: analysis.edges,
                    });
                    setInputNodes(analysis.nodes);
                    setInputEdges(analysis.edges);
                  }
                  setLoadingAnalysis(false);
                }}
                disabled={loadingAnalysis}
                className="gap-2"
              >
                <FolderGit2 className="w-4 h-4" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">Analyze Repository</span>
                  <span className="text-xs text-gray-500">
                    Analyze all Kotlin files in the repository
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  setLoadingAnalysis(true);
                  const result = await analyzeSelected(
                    owner,
                    repoName,
                    selectedPaths
                  );
                  if (result) {
                    const { graphNodes, graphEdges } = result;
                    setGraph({
                      nodes: graphNodes,
                      edges: graphEdges,
                    });
                    setInputNodes(graphNodes);
                    setInputEdges(graphEdges);
                  }
                  setLoadingAnalysis(false);
                }}
                disabled={selectedPaths.size === 0 || loadingAnalysis}
                className="gap-2"
              >
                <SquareDashedMousePointer className="w-4 h-4" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">
                    Analyze Selected ({selectedPaths.size})
                  </span>
                  <span className="text-xs text-gray-500">
                    {selectedPaths.size === 0
                      ? "Select files or folders first"
                      : "Analyze only selected files and folders"}
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
