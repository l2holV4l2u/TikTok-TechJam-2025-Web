"use client";

import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  Node,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import "@xyflow/react/dist/style.css";
import {
  canDisplayAsText,
  createEdgeFromData,
  fetchGitHubFileContent,
  findFileSha,
  formatFileSize,
  getLayoutedElements,
  getNodeLabel,
} from "@/utils/graphUtils";
import { GraphNode, SelectedNode } from "@/types/graphTypes";
import { useAtomValue, useSetAtom } from "jotai";
import {
  inputEdgesAtom,
  inputNodesAtom,
  showCriticalNodesAtom,
  showCyclesAtom,
  showHeavyNodesAtom,
  showLongestPathAtom,
} from "@/lib/atom/graphAtom";
import { GraphLegend } from "./graphLegend";
import { toast } from "sonner";
import { FileNode } from "@/lib/tree";
import { CodeModal } from "./graphCodeModal";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ChartColumnBig, CodeXml } from "lucide-react";
import {
  getMiniMapNodeColor,
  getStyledEdges,
  getStyledNodes,
} from "@/utils/graphStyle";
import { NODE_COLORS } from "@/constant/graph";
import {
  analysisAtom,
  fileTreeAtom,
  ownerAtom,
  repoNameAtom,
  highlightedFileAtom,
} from "@/lib/atom/repoAtom";

function createNodeFromData(
  node: GraphNode,
  index: number,
  onViewCode: (nodeId: string) => void,
  onAnalyze: (nodeId: string) => void
) {
  return {
    id: node.id,
    type: "default",
    position: { x: 0, y: 0 },
    data: {
      graphNode: node, // Store the original GraphNode data
      label: (
        <ContextMenu>
          <ContextMenuTrigger>
            <div className="flex flex-col items-center justify-center p-3">
              <div
                className={`rounded-sm bg-gradient-to-br flex items-center justify-center shadow-lg p-1 ${
                  NODE_COLORS[index % NODE_COLORS.length]
                }`}
              >
                <div className="text-white font-semibold text-sm text-center leading-tight w-30 h-16 p-1 flex items-center justify-center overflow-hidden">
                  <span className="line-clamp-3 break-words">
                    {getNodeLabel(node.id)}
                  </span>
                </div>
              </div>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
              {node.id}
            </div>

            <ContextMenuItem
              className="flex items-center gap-2"
              onClick={() => onViewCode(node.id)}
            >
              <CodeXml size={16} />
              View Code
            </ContextMenuItem>

            <ContextMenuItem
              className="flex items-center gap-2"
              onClick={() => onAnalyze(node.id)}
            >
              <ChartColumnBig size={16} />
              Analyze Impact
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
    },
    style: {
      background: "rgba(255, 255, 255, 0.95)",
      border: "2px solid rgba(148, 163, 184, 0.3)",
      borderRadius: "16px",
      padding: "0",
      boxShadow:
        "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      backdropFilter: "blur(8px)",
      minWidth: "140px",
      minHeight: "100px",
    },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  };
}

export const DependencyGraph = () => {
  const inputNodes = useAtomValue(inputNodesAtom);
  const inputEdges = useAtomValue(inputEdgesAtom);
  const analysis = useAtomValue(analysisAtom);
  const owner = useAtomValue(ownerAtom);
  const repoName = useAtomValue(repoNameAtom);
  const fileTree = useAtomValue(fileTreeAtom);
  const showCycles = useAtomValue(showCyclesAtom);
  const showHeavyNodes = useAtomValue(showHeavyNodesAtom);
  const showLongestPath = useAtomValue(showLongestPathAtom);
  const showCriticalNodes = useAtomValue(showCriticalNodesAtom);
  const highlightedFile = useAtomValue(highlightedFileAtom);
  const setHighlightedFile = useSetAtom(highlightedFileAtom);
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);
  const [codeModal, setCodeModal] = useState<{
    isOpen: boolean;
    nodeId: string;
    code: string;
    isLoading: boolean;
    fileInfo?: {
      path: string;
      size: number;
      mimeType: string;
      isBinary: boolean;
    };
  }>({ isOpen: false, nodeId: "", code: "", isLoading: false });

  const handleViewCode = useCallback(
    async (nodeId: string) => {
      const node = inputNodes.find((n) => n.id === nodeId);
      const filePath = node?.definedIn?.file;

      if (!filePath) {
        toast.error("No file path available for this node");
        return;
      }

      const fileSha = findFileSha(fileTree, filePath);

      if (!fileSha) {
        toast.error("No file SHA available for this node");
        return;
      }

      setCodeModal({ isOpen: true, nodeId, code: "", isLoading: true });

      try {
        const fileData = await fetchGitHubFileContent(
          owner,
          repoName,
          fileSha,
          filePath
        );

        if (!canDisplayAsText(fileData)) {
          const fileType = fileData.isBinary ? "binary" : "text";
          const sizeInfo = formatFileSize(fileData.size);

          setCodeModal((prev) => ({
            ...prev,
            code: `// Cannot display ${fileType} file: ${filePath}\n// File size: ${sizeInfo}\n// MIME type: ${fileData.mimeType}\n\n// Download URL: ${fileData.downloadUrl}`,
            isLoading: false,
            fileInfo: {
              path: fileData.path,
              size: fileData.size,
              mimeType: fileData.mimeType,
              isBinary: fileData.isBinary,
            },
          }));
          return;
        }

        setCodeModal((prev) => ({
          ...prev,
          code: fileData.content || "",
          isLoading: false,
          fileInfo: {
            path: fileData.path,
            size: fileData.size,
            mimeType: fileData.mimeType,
            isBinary: fileData.isBinary,
          },
        }));
      } catch (error) {
        console.error("Failed to fetch file content:", error);
        toast.error(
          `Failed to load code: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );

        setCodeModal((prev) => ({
          ...prev,
          code: `// Error loading file: ${filePath}\n// ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          isLoading: false,
        }));
      }
    },
    [inputNodes, fileTree, owner, repoName]
  );

  const handleAnalyzeImpact = useCallback((nodeId: string) => {
    // Show impact analysis for this specific node
    console.log(`Analyzing impact of ${nodeId}`);
    // You could open a modal with impact metrics, affected components, etc.
  }, []);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const n = inputNodes.map((node, index) =>
      createNodeFromData(node, index, handleViewCode, handleAnalyzeImpact)
    );
    const e = inputEdges.map(createEdgeFromData);
    return getLayoutedElements(n, e);
  }, [inputNodes, inputEdges, handleViewCode, handleAnalyzeImpact]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Clear selectedNode when any analysis view becomes active
  useEffect(() => {
    if (showCycles || showHeavyNodes || showLongestPath || showCriticalNodes) {
      setSelectedNode(null);
      setHighlightedFile(null); // Also clear highlighted file
    }
  }, [showCycles, showHeavyNodes, showLongestPath, showCriticalNodes, setHighlightedFile]);

  const adjacency = useMemo(() => {
    const parentsMap = new Map<string, Set<string>>();
    const childrenMap = new Map<string, Set<string>>();

    edges.forEach((edge) => {
      if (!parentsMap.has(edge.target)) parentsMap.set(edge.target, new Set());
      if (!childrenMap.has(edge.source))
        childrenMap.set(edge.source, new Set());
      parentsMap.get(edge.target)!.add(edge.source);
      childrenMap.get(edge.source)!.add(edge.target);
    });

    return { parentsMap, childrenMap };
  }, [edges]);

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      // Clear highlighted file when a node is manually selected
      setHighlightedFile(null);
      
      // Only allow node selection when no analysis view is active
      setSelectedNode((prev) =>
        prev?.id === node.id
          ? null
          : {
              id: node.id,
              path:
                inputNodes.find((n) => n.id == node.id)?.definedIn?.file ||
                "undefined",
            }
      );
    },
    [inputNodes, showCycles, showHeavyNodes, showLongestPath, showCriticalNodes, setHighlightedFile]
  );

  const styledNodes = useMemo(() => {
    return getStyledNodes(nodes, selectedNode, adjacency, analysis, {
      showCycles,
      showHeavyNodes,
      showLongestPath,
      showCriticalNodes,
    }, highlightedFile);
  }, [
    nodes,
    selectedNode,
    adjacency,
    analysis,
    showCycles,
    showHeavyNodes,
    showLongestPath,
    showCriticalNodes,
    highlightedFile,
  ]);

  const styledEdges = useMemo(() => {
    return getStyledEdges(edges, selectedNode, adjacency, analysis, {
      showCycles,
      showHeavyNodes,
      showLongestPath,
      showCriticalNodes,
    }, highlightedFile);
  }, [
    edges,
    selectedNode,
    adjacency,
    analysis,
    showCycles,
    showHeavyNodes,
    showLongestPath,
    showCriticalNodes,
    highlightedFile,
  ]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-blue-50 relative">
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2, minZoom: 0.5 }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
      >
        <Background gap={20} size={1} style={{ opacity: 0.5 }} />
        <Controls />
        <GraphLegend />
        <MiniMap
          nodeColor={(node) =>
            getMiniMapNodeColor(node, selectedNode, adjacency, analysis, {
              showCycles,
              showHeavyNodes,
              showLongestPath,
              showCriticalNodes,
            }, highlightedFile)
          }
        />
      </ReactFlow>
      <CodeModal
        isOpen={codeModal.isOpen}
        onClose={() => setCodeModal((prev) => ({ ...prev, isOpen: false }))}
        nodeId={codeModal.nodeId}
        content={codeModal.code}
        isLoading={codeModal.isLoading}
        fileInfo={codeModal.fileInfo}
      />
    </div>
  );
};
