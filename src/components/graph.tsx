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
} from "../app/utils/graphUtils";
import { GraphNode, SelectedNode } from "../app/types/graphTypes";
import { useAtomValue } from "jotai";
import {
  analysisAtom,
  inputEdgesAtom,
  inputNodesAtom,
  showCriticalNodesAtom,
  showCyclesAtom,
  showHeavyNodesAtom,
  showLongestPathAtom,
} from "@/lib/graphAtom";
import { GraphLegend } from "./graphLegend";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { ChartColumnBig, CodeXml, Copy, Link } from "lucide-react";
import { FileNode } from "@/lib/tree";

// Context Menu Component
const ContextMenu = ({
  x,
  y,
  node,
  onClose,
  onViewCode,
  onAnalyze,
}: {
  x: number;
  y: number;
  node: Node | null;
  onClose: () => void;
  onViewCode: (nodeId: string) => void;
  onAnalyze: (nodeId: string) => void;
}) => {
  useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [onClose]);

  if (!node) return null;

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-48"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1 text-xs text-gray-500 border-b border-gray-100 mb-1">
        {node.id}
      </div>

      <button
        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm cursor-pointer"
        onClick={() => {
          onViewCode(node.id);
          onClose();
        }}
      >
        <CodeXml size={16} />
        View Code
      </button>

      <button
        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm cursor-pointer"
        onClick={() => {
          onAnalyze(node.id);
          onClose();
        }}
      >
        <ChartColumnBig size={16} />
        Analyze Impact
      </button>
    </div>
  );
};

// Code Modal Component
const CodeModal = ({
  isOpen,
  onClose,
  nodeId,
  content,
  isLoading,
  fileInfo,
}: {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  content: string;
  isLoading: boolean;
  fileInfo?: {
    path: string;
    size: number;
    mimeType: string;
    isBinary: boolean;
  };
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-left">
            <div className="flex flex-col gap-1">
              <span>Code: {nodeId}</span>
              {fileInfo && (
                <div className="text-sm font-normal text-muted-foreground flex items-center gap-4">
                  <span>{fileInfo.path}</span>
                  <span>{formatFileSize(fileInfo.size)}</span>
                  <span>{fileInfo.mimeType}</span>
                  {fileInfo.isBinary && (
                    <span className="text-orange-600">Binary</span>
                  )}
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2">Loading file content...</span>
            </div>
          ) : (
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
              <code>{content}</code>
            </pre>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
          {!isLoading && content && (
            <Button
              variant="highlight"
              size="sm"
              onClick={() => {
                navigator.clipboard
                  .writeText(content)
                  .then(() => {
                    toast.success("Code copied to clipboard!");
                  })
                  .catch(() => {
                    toast.error("Failed to copy code");
                  });
              }}
              className="gap-2"
            >
              <Copy size={16} /> Copy Code
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function createNodeFromData(node: GraphNode, index: number) {
  const colors = [
    "from-purple-500 to-indigo-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-red-600",
    "from-pink-500 to-rose-600",
    "from-violet-500 to-purple-600",
  ];

  return {
    id: node.id,
    type: "default",
    position: { x: 0, y: 0 },
    data: {
      label: (
        <div className="flex flex-col items-center justify-center p-3">
          <div
            className={`rounded-sm bg-gradient-to-br ${
              colors[index % colors.length]
            } flex items-center justify-center shadow-lg p-1`}
          >
            <div className="text-white font-semibold text-sm text-center leading-tight w-30 h-16 p-1 flex items-center justify-center overflow-hidden">
              <span className="line-clamp-3 break-words">
                {getNodeLabel(node.id)}
              </span>
            </div>
          </div>
        </div>
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

export const DependencyGraph = ({
  fileTree,
  owner,
  repo,
}: {
  fileTree: FileNode[];
  owner: string;
  repo: string;
}) => {
  const inputNodes = useAtomValue(inputNodesAtom);
  const inputEdges = useAtomValue(inputEdgesAtom);
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const n = inputNodes.map(createNodeFromData);
    const e = inputEdges.map(createEdgeFromData);
    return getLayoutedElements(n, e);
  }, [inputNodes, inputEdges]);
  const showCycles = useAtomValue(showCyclesAtom);
  const analysis = useAtomValue(analysisAtom);
  const showHeavyNodes = useAtomValue(showHeavyNodesAtom);
  const showLongestPath = useAtomValue(showLongestPathAtom);
  const showCriticalNodes = useAtomValue(showCriticalNodesAtom);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: Node | null;
  } | null>(null);
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

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
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
  }, []);

  // NEW: Context menu handlers
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        node,
      });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleViewCode = useCallback(
    async (nodeId: string) => {
      const node = inputNodes.find((n) => n.id === nodeId);
      const filePath = node?.definedIn?.file;

      if (!filePath) {
        toast.error("No file path available for this node");
        return;
      }

      // Use the utility function to find SHA from the nested tree
      const fileSha = findFileSha(fileTree, filePath);

      if (!fileSha) {
        toast.error("No file SHA available for this node");
        return;
      }

      setCodeModal({
        isOpen: true,
        nodeId,
        code: "",
        isLoading: true,
      });

      try {
        const fileData = await fetchGitHubFileContent(
          owner,
          repo,
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
    [inputNodes, fileTree] // Add fileTree to dependencies
  );

  const handleAnalyzeImpact = useCallback((nodeId: string) => {
    // Show impact analysis for this specific node
    console.log(`Analyzing impact of ${nodeId}`);
    // You could open a modal with impact metrics, affected components, etc.
  }, []);

  if (!analysis) {
    return <></>;
  }

  const styledNodes = useMemo(() => {
    return nodes.map((node) => {
      const isSelected = node.id === selectedNode?.id;
      const isParent =
        selectedNode && adjacency.parentsMap.get(selectedNode.id)?.has(node.id);
      const isChild =
        selectedNode &&
        adjacency.childrenMap.get(selectedNode.id)?.has(node.id);
      const isInCycle = showCycles && analysis.cycles.cycleNodes.has(node.id);
      const isHeavy =
        showHeavyNodes &&
        analysis.heaviestNodes.slice(0, 3).some((n) => n.id === node.id);
      const isInLongestPath =
        showLongestPath && analysis.longestPaths[0]?.path.includes(node.id);
      const isCritical =
        showCriticalNodes &&
        analysis.criticalNodes.slice(0, 3).includes(node.id);

      let extra: React.CSSProperties = {};

      if (isSelected) {
        extra = {
          boxShadow:
            "0 0 0 3px rgba(99, 102, 241, 0.5), 0 20px 35px -5px rgba(99, 102, 241, 0.4)",
          border: "3px solid #6366f1",
          zIndex: 10,
        };
      } else if (isParent) {
        extra = {
          boxShadow:
            "0 0 0 2px rgba(34, 197, 94, 0.5), 0 15px 25px -5px rgba(34, 197, 94, 0.3)",
          border: "2px solid #22c55e",
          background: "rgba(240, 253, 244, 0.95)",
        };
      } else if (isChild) {
        extra = {
          boxShadow:
            "0 0 0 2px rgba(249, 115, 22, 0.5), 0 15px 25px -5px rgba(249, 115, 22, 0.3)",
          border: "2px solid #f97316",
          background: "rgba(255, 247, 237, 0.95)",
        };
      } else if (isInCycle) {
        extra = {
          boxShadow:
            "0 0 0 2px rgba(239, 68, 68, 0.6), 0 15px 25px -5px rgba(239, 68, 68, 0.4)",
          border: "2px solid #ef4444",
          background: "rgba(254, 242, 242, 0.95)",
        };
      } else if (isHeavy) {
        extra = {
          boxShadow:
            "0 0 0 2px rgba(168, 85, 247, 0.6), 0 15px 25px -5px rgba(168, 85, 247, 0.4)",
          border: "2px solid #a855f7",
          background: "rgba(250, 245, 255, 0.95)",
        };
      } else if (isInLongestPath) {
        extra = {
          boxShadow:
            "0 0 0 2px rgba(14, 165, 233, 0.6), 0 15px 25px -5px rgba(14, 165, 233, 0.4)",
          border: "2px solid #0ea5e9",
          background: "rgba(240, 249, 255, 0.95)",
        };
      } else if (isCritical) {
        extra = {
          boxShadow:
            "0 0 0 2px rgba(245, 158, 11, 0.6), 0 15px 25px -5px rgba(245, 158, 11, 0.4)",
          border: "2px solid #f59e0b",
          background: "rgba(255, 251, 235, 0.95)",
        };
      } else if (selectedNode && !isSelected && !isParent && !isChild) {
        extra = { opacity: 0.3, filter: "grayscale(0.7)" };
      }

      return { ...node, style: { ...node.style, ...extra } };
    });
  }, [
    nodes,
    selectedNode,
    adjacency,
    showCycles,
    showHeavyNodes,
    showLongestPath,
    showCriticalNodes,
    analysis,
  ]);

  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const isParentEdge =
        selectedNode &&
        edge.target === selectedNode.id &&
        adjacency.parentsMap.get(selectedNode.id)?.has(edge.source);
      const isChildEdge =
        selectedNode &&
        edge.source === selectedNode.id &&
        adjacency.childrenMap.get(selectedNode.id)?.has(edge.target);
      const isInCycle =
        showCycles &&
        analysis.cycles.cycleEdges.has(`${edge.source}-${edge.target}`);
      const isInLongestPath =
        showLongestPath &&
        analysis.longestPaths[0]?.path.some(
          (_, i) =>
            i < analysis.longestPaths[0].path.length - 1 &&
            analysis.longestPaths[0].path[i] === edge.source &&
            analysis.longestPaths[0].path[i + 1] === edge.target
        );

      let style = { ...edge.style };

      if (isParentEdge) {
        style = {
          ...style,
          stroke: "#22c55e",
          strokeWidth: 3,
          opacity: 1,
        };
      } else if (isChildEdge) {
        style = {
          ...style,
          stroke: "#f97316",
          strokeWidth: 3,
          opacity: 1,
        };
      } else if (isInCycle) {
        style = {
          ...style,
          stroke: "#ef4444",
          strokeWidth: 3,
          opacity: 1,
          strokeDasharray: "8,4",
        };
      } else if (isInLongestPath) {
        style = {
          ...style,
          stroke: "#0ea5e9",
          strokeWidth: 3,
          opacity: 1,
          strokeDasharray: "12,4",
        };
      } else if (selectedNode && !isParentEdge && !isChildEdge) {
        style = { ...style, opacity: 0.2 };
      }

      return { ...edge, style };
    });
  }, [edges, selectedNode, adjacency, showCycles, showLongestPath, analysis]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-blue-50 relative">
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2, minZoom: 0.5 }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
      >
        <Background
          color="#e2e8f0"
          gap={20}
          size={1}
          style={{ opacity: 0.5 }}
        />
        <Controls className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-lg" />
        <GraphLegend
          showCycles={showCycles}
          showHeavyNodes={showHeavyNodes}
          showCriticalNodes={showCriticalNodes}
          showLongestPath={showLongestPath}
        />
        <MiniMap
          className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-lg"
          nodeColor={(node) => {
            if (showCycles && analysis.cycles.cycleNodes.has(node.id))
              return "#ef4444";
            if (
              showHeavyNodes &&
              analysis.heaviestNodes.slice(0, 3).some((n) => n.id === node.id)
            )
              return "#a855f7";
            if (
              showLongestPath &&
              analysis.longestPaths[0]?.path.includes(node.id)
            )
              return "#0ea5e9";
            if (
              showCriticalNodes &&
              analysis.criticalNodes.slice(0, 3).includes(node.id)
            )
              return "#f59e0b";
            if (!selectedNode) return "#94a3b8";
            if (selectedNode.id === node.id) return "#6366f1";
            if (adjacency.parentsMap.get(selectedNode.id)?.has(node.id))
              return "#22c55e";
            if (adjacency.childrenMap.get(selectedNode.id)?.has(node.id))
              return "#f97316";
            return "#d1d5db";
          }}
          maskColor="rgba(255, 255, 255, 0.8)"
        />
      </ReactFlow>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={closeContextMenu}
          onViewCode={handleViewCode}
          onAnalyze={handleAnalyzeImpact}
        />
      )}

      {/* Code Modal */}
      <CodeModal
        isOpen={codeModal.isOpen}
        onClose={() => setCodeModal((prev) => ({ ...prev, isOpen: false }))}
        nodeId={codeModal.nodeId}
        content={codeModal.code} // Changed from 'code' to 'content'
        isLoading={codeModal.isLoading}
        fileInfo={codeModal.fileInfo}
      />
    </div>
  );
};
