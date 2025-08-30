import { GraphNode, CycleInfo, GraphAnalysis } from "../types/graphTypes";

// Cycle detection using DFS with recursion stack
export function detectCycles(
  nodes: GraphNode[],
  edges: { source: string; target: string }[]
): CycleInfo {
  const adjacencyList = new Map<string, string[]>();
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];
  const cycleNodes = new Set<string>();
  const cycleEdges = new Set<string>();

  // Build adjacency list
  nodes.forEach((node) => adjacencyList.set(node.id, []));
  edges.forEach((edge) => {
    if (!adjacencyList.has(edge.source)) adjacencyList.set(edge.source, []);
    adjacencyList.get(edge.source)!.push(edge.target);
  });

  function dfs(nodeId: string, path: string[]): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    const currentPath = [...path, nodeId];

    const neighbors = adjacencyList.get(nodeId) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, currentPath)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle - extract the cycle from the path
        const cycleStartIndex = currentPath.indexOf(neighbor);
        const cycle = [...currentPath.slice(cycleStartIndex), neighbor];

        // Only add if it's a new cycle (not a subset of existing)
        const cycleKey = cycle.slice(0, -1).sort().join("-");
        const existingCycleKeys = cycles.map((c) =>
          c.slice(0, -1).sort().join("-")
        );

        if (!existingCycleKeys.includes(cycleKey)) {
          cycles.push(cycle);

          // Mark all nodes and edges in this cycle
          cycle.forEach((nodeId) => cycleNodes.add(nodeId));
          for (let i = 0; i < cycle.length - 1; i++) {
            cycleEdges.add(`${cycle[i]}-${cycle[i + 1]}`);
          }
        }

        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check for cycles starting from each unvisited node
  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  });

  return { cycles, cycleNodes, cycleEdges };
}

// Find all paths from source to target using DFS
export function findAllPaths(
  adjacencyList: Map<string, string[]>,
  start: string,
  end: string,
  maxDepth: number = 20
): string[][] {
  const paths: string[][] = [];
  const visited = new Set<string>();

  function dfs(current: string, target: string, path: string[], depth: number) {
    if (depth > maxDepth) return;
    if (current === target) {
      paths.push([...path, current]);
      return;
    }

    visited.add(current);
    const neighbors = adjacencyList.get(current) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, target, [...path, current], depth + 1);
      }
    }
    visited.delete(current);
  }

  dfs(start, end, [], 0);
  return paths;
}

// Comprehensive graph analysis
export function analyzeGraph(
  nodes: GraphNode[],
  edges: { source: string; target: string }[]
): GraphAnalysis {
  const adjacencyList = new Map<string, string[]>();
  const reverseAdjacencyList = new Map<string, string[]>();
  const incomingCount = new Map<string, number>();
  const outgoingCount = new Map<string, number>();

  // Initialize maps
  nodes.forEach((node) => {
    adjacencyList.set(node.id, []);
    reverseAdjacencyList.set(node.id, []);
    incomingCount.set(node.id, 0);
    outgoingCount.set(node.id, 0);
  });

  // Build adjacency lists and counts
  edges.forEach((edge) => {
    adjacencyList.get(edge.source)?.push(edge.target);
    reverseAdjacencyList.get(edge.target)?.push(edge.source);
    incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
    outgoingCount.set(edge.source, (outgoingCount.get(edge.source) || 0) + 1);
  });

  // Detect cycles
  const cycles = detectCycles(nodes, edges);

  // Find heaviest nodes (most dependencies)
  const heaviestNodes = nodes
    .map((node) => ({
      id: node.id,
      incoming: incomingCount.get(node.id) || 0,
      outgoing: outgoingCount.get(node.id) || 0,
      totalDependencies:
        (incomingCount.get(node.id) || 0) + (outgoingCount.get(node.id) || 0),
    }))
    .sort((a, b) => b.totalDependencies - a.totalDependencies)
    .slice(0, 5);

  // Find root nodes (no incoming edges)
  const rootNodes = nodes
    .filter((node) => (incomingCount.get(node.id) || 0) === 0)
    .map((node) => node.id);

  // Find leaf nodes (no outgoing edges)
  const leafNodes = nodes
    .filter((node) => (outgoingCount.get(node.id) || 0) === 0)
    .map((node) => node.id);

  // Find isolated nodes (no edges at all)
  const isolatedNodes = nodes
    .filter(
      (node) =>
        (incomingCount.get(node.id) || 0) === 0 &&
        (outgoingCount.get(node.id) || 0) === 0
    )
    .map((node) => node.id);

  // Find longest paths
  const longestPaths: { path: string[]; length: number }[] = [];

  // For each root node, find the longest path from it
  rootNodes.forEach((root) => {
    function findLongestPathFromNode(
      nodeId: string,
      visited: Set<string>,
      currentPath: string[]
    ): string[] {
      const neighbors = adjacencyList.get(nodeId) || [];
      let longestPath = [...currentPath, nodeId];

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          const pathFromNeighbor = findLongestPathFromNode(neighbor, visited, [
            ...currentPath,
            nodeId,
          ]);
          if (pathFromNeighbor.length > longestPath.length) {
            longestPath = pathFromNeighbor;
          }
          visited.delete(neighbor);
        }
      }

      return longestPath;
    }

    const visited = new Set<string>();
    visited.add(root);
    const longestFromRoot = findLongestPathFromNode(root, visited, []);
    if (longestFromRoot.length > 1) {
      longestPaths.push({
        path: longestFromRoot,
        length: longestFromRoot.length - 1,
      });
    }
  });

  // Sort by length and take top 3
  longestPaths.sort((a, b) => b.length - a.length);
  const topLongestPaths = longestPaths.slice(0, 3);

  // Find critical nodes (nodes that appear in many dependency paths)
  const nodePathCount = new Map<string, number>();

  // Count how many times each node appears in paths between other nodes
  nodes.forEach((startNode) => {
    nodes.forEach((endNode) => {
      if (startNode.id !== endNode.id) {
        const paths = findAllPaths(adjacencyList, startNode.id, endNode.id, 10);
        paths.forEach((path) => {
          path.forEach((nodeId) => {
            nodePathCount.set(nodeId, (nodePathCount.get(nodeId) || 0) + 1);
          });
        });
      }
    });
  });

  const criticalNodes = Array.from(nodePathCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nodeId]) => nodeId);

  // Calculate max depth
  const maxDepth = Math.max(...topLongestPaths.map((p) => p.length), 0);

  return {
    cycles,
    heaviestNodes,
    longestPaths: topLongestPaths,
    criticalNodes,
    isolatedNodes,
    leafNodes,
    rootNodes,
    maxDepth,
  };
}
