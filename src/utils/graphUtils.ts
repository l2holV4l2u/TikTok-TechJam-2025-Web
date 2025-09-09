import dagre from "@dagrejs/dagre";
import { Edge, MarkerType, Node, Position } from "@xyflow/react";
import { GitHubFileResponse, GraphEdge } from "@/types/graphTypes";
import { FileNode } from "@/lib/tree";

// Auto-layout function for hierarchical arrangement
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB" // top-bottom or left-right
): { nodes: Node[]; edges: Edge[] } {
  const nodeWidth = 180;
  const nodeHeight = 120;
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  console.log(nodes);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function createEdgeFromData(edge: GraphEdge) {
  return {
    id: `${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    animated: true,
    style: {
      stroke: "#6366f1",
      strokeWidth: 2,
      strokeDasharray: "5,5",
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#6366f1",
      width: 20,
      height: 20,
    },
    labelStyle: {
      fontSize: 12,
      fontWeight: 600,
      fill: "#4f46e5",
    },
  };
}

export function getNodeLabel(nodeId: string): string {
  const parts = nodeId.split(".");
  return parts[parts.length - 1];
}

export async function analyzeFile(
  owner: string,
  name: string,
  selectedPaths: Set<string>
) {
  const requestBody = {
    owner,
    repo: name,
    includePaths: Array.from(selectedPaths),
  };

  const response = await fetch("/api/analyze/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Selection analysis failed: ${response.statusText} ${errText}`
    );
  }

  return await response.json();
}

export async function fetchGitHubFileContent(
  owner: string,
  repo: string,
  sha: string,
  path: string
): Promise<GitHubFileResponse> {
  try {
    const params = new URLSearchParams({
      owner,
      repo,
      sha,
      path,
    });

    const response = await fetch(`/api/github/file?${params}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data: GitHubFileResponse = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error("Error fetching GitHub file:", error);
    throw new Error(
      `Unable to fetch file content: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function canDisplayAsText(fileData: GitHubFileResponse): boolean {
  return !fileData.isBinary && fileData.isText && fileData.content !== null;
}

export function findFileSha(fileTree: FileNode[], filePath: string) {
  function searchTree(nodes: FileNode[]): string | undefined {
    for (const node of nodes) {
      if (node.type === "file" && node.path === filePath) {
        return node.sha;
      }
      if (node.type === "folder" && node.children) {
        const result = searchTree(node.children);
        if (result) return result;
      }
    }
    return undefined;
  }

  return searchTree(fileTree);
}
