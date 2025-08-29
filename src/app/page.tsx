"use client";

import {
  ArrowRightIcon,
  FireIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { Github, Package, Search, Zap } from "lucide-react";
// KNIT:START — before/after graphs + JSON toggle
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "reactflow/dist/style.css";

// 1) Dynamic import for ReactFlow (no SSR):
const ReactFlow = dynamic(
  () => import("reactflow").then((mod) => ({ default: mod.ReactFlow })),
  { ssr: false }
);

// TypeScript types
interface KnitNode {
  id: string;
  label: string;
}

interface KnitEdge {
  id?: string;
  source: string;
  target: string;
  issue?: "circular" | "unnecessary";
}

interface KnitFixResponse {
  nodes: KnitNode[];
  edges: KnitEdge[];
  suggestions: string[];
  input?: { fileToDefinedNodes: Record<string, string[]> };
}

interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: { label: string };
  style?: any;
}

interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  style?: any;
  animated?: boolean;
  label?: string;
}
// KNIT:END

export default function Home() {
  // KNIT:START
  // 2) Local state:
  const [dataJson] = useState({
    fileToDefinedNodes: {
      "src/main/java/tiktok/knit/sample/Another.kt": [
        "tiktok.knit.sample.Another",
        "tiktok.knit.sample.IAnother",
        "tiktok.knit.sample.AA",
      ],
      "src/main/java/tiktok/knit/sample/MainActivity.kt": [
        "tiktok.knit.sample.MainActivity",
      ],
    },
  });

  const [showJson, setShowJson] = useState(false);
  const [loading, setLoading] = useState(false);
  const [beforeNodes, setBeforeNodes] = useState<ReactFlowNode[]>([]);
  const [beforeEdges, setBeforeEdges] = useState<ReactFlowEdge[]>([]);
  const [afterNodes, setAfterNodes] = useState<ReactFlowNode[]>([]);
  const [afterEdges, setAfterEdges] = useState<ReactFlowEdge[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<KnitFixResponse | null>(null);
  const [showKnitVisualizer, setShowKnitVisualizer] = useState(false);

  // 3) Build beforeNodes from fileToDefinedNodes on mount/prop change
  useEffect(() => {
    const allNodes: string[] = [];
    Object.values(dataJson.fileToDefinedNodes).forEach((nodes) => {
      allNodes.push(...nodes);
    });

    const nodes: ReactFlowNode[] = allNodes.map((nodeId, index) => ({
      id: nodeId,
      type: "default",
      position: {
        x: (index % 3) * 200 + 50,
        y: Math.floor(index / 3) * 120 + 50,
      },
      data: {
        label: nodeId.split(".").pop() || nodeId,
      },
      style: {
        background: "#E0E7FF",
        border: "2px solid #6366F1",
        borderRadius: "8px",
        padding: "8px",
        fontSize: "11px",
        width: 140,
      },
    }));

    // Optional: create dashed edges linking nodes defined in the same file
    const edges: ReactFlowEdge[] = [];
    Object.entries(dataJson.fileToDefinedNodes).forEach(([file, fileNodes]) => {
      if (fileNodes.length > 1) {
        for (let i = 0; i < fileNodes.length - 1; i++) {
          edges.push({
            id: `before-${file}-${i}`,
            source: fileNodes[i],
            target: fileNodes[i + 1],
            style: {
              stroke: "#94A3B8",
              strokeWidth: 1,
              strokeDasharray: "5,5",
            },
          });
        }
      }
    });

    setBeforeNodes(nodes);
    setBeforeEdges(edges);
  }, [dataJson]);

  // 4) Handle Fix button:
  const handleFixDependencies = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/knit-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataJson),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      setApiResponse(result);

      // Parse KnitFixResponse and map to ReactFlow nodes/edges
      if (result.success && result.graphData) {
        const nodes: ReactFlowNode[] = result.graphData.nodes.map(
          (node: any) => ({
            id: node.id,
            type: "default",
            position: node.position,
            data: { label: node.data.label },
            style: {
              background: "#F0FDF4",
              border: "2px solid #10B981",
              borderRadius: "8px",
              padding: "8px",
              fontSize: "11px",
              width: 140,
            },
          })
        );

        const edges: ReactFlowEdge[] = result.graphData.edges.map(
          (edge: any) => {
            const isProblematic = edge.source === edge.target || edge.issue;
            return {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              style: {
                stroke: isProblematic ? "#EF4444" : "#6B7280",
                strokeWidth: isProblematic ? 3 : 2,
              },
              animated: edge.source === edge.target,
              label: edge.issue || undefined,
            };
          }
        );

        setAfterNodes(nodes);
        setAfterEdges(edges);
        setSuggestions(result.suggestions || []);
        setShowKnitVisualizer(true);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to analyze dependencies"
      );
    } finally {
      setLoading(false);
    }
  };
  // KNIT:END

  const features = [
    {
      icon: <Search className="w-6 h-6" />,
      title: "Smart Detection",
      description:
        "Automatically scan and detect all dependencies in your Kotlin projects with intelligent parsing.",
    },
    {
      icon: <ChartBarIcon className="w-6 h-6" />,
      title: "Visual Analysis",
      description:
        "Beautiful interactive graphs and charts to understand your dependency relationships.",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Smart Suggestions",
      description:
        "Get AI-powered recommendations for optimizing and updating your dependencies.",
    },
    {
      icon: <Package className="w-6 h-6" />,
      title: "Version Management",
      description:
        "Track versions, identify conflicts, and manage updates across your entire project.",
    },
  ];

  const handleGetStarted = () => {
    // Placeholder for future authentication logic
    console.log("Get started clicked");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-100/50 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-100/50 to-transparent"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center p-6 lg:p-8">
        <div className="flex items-center space-x-2 animate-fade-in-left">
          <FireIcon className="w-8 h-8 text-purple-600" />
          <span className="text-gray-900 text-xl font-bold">Tokbokki</span>
        </div>

        <button
          onClick={handleGetStarted}
          className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm border border-gray-200 text-gray-900 px-6 py-2 rounded-full hover:bg-white/90 hover:scale-[1.02] transition-all duration-200 shadow-sm animate-fade-in-right"
        >
          <Github className="w-4 h-4" />
          <span>Sign in with GitHub</span>
        </button>
        {/* KNIT:START */}
        <button
          onClick={handleFixDependencies}
          disabled={loading}
          className="ml-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white px-6 py-2 rounded-full font-semibold hover:scale-[1.02] transition-all duration-200 shadow-lg"
        >
          {loading ? "Analyzing..." : "Fix Dependencies"}
        </button>
        {/* KNIT:END */}
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="max-w-4xl mx-auto animate-fade-in-up">
          <h1 className="text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight animate-fade-in-up animation-delay-200">
            Visualize Your
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {" "}
              Kotlin{" "}
            </span>
            Dependencies
          </h1>

          <p className="text-xl lg:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-400">
            Detect, analyze, and optimize your Kotlin project dependencies with
            beautiful visualizations and intelligent suggestions.
          </p>

          <button
            onClick={handleGetStarted}
            className="group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-full text-lg font-semibold hover:scale-[1.02] transition-all duration-200 shadow-xl hover:shadow-purple-500/25 animate-fade-in-up animation-delay-600"
          >
            <span className="flex items-center space-x-2">
              <Github className="w-5 h-5" />
              <span>Get Started with GitHub</span>
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-100" />
            </span>
          </button>
        </div>

        {/* Floating Elements - Pure CSS */}
        <div className="absolute top-20 left-20 w-16 h-16 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full opacity-30 blur-xl animate-float pointer-events-none"></div>
        <div className="absolute bottom-40 right-20 w-24 h-24 bg-gradient-to-r from-blue-300 to-purple-300 rounded-full opacity-25 blur-2xl animate-float-slow pointer-events-none"></div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Everything you need to understand and optimize your Kotlin project
              dependencies
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 hover:bg-white/90 hover:-translate-y-1 transition-all duration-200 shadow-sm hover:shadow-md animate-fade-in-up"
                style={{ animationDelay: `${index * 100 + 800}ms` }}
              >
                <div className="text-purple-600 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-12 shadow-lg animate-fade-in-up">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Ready to Start?
          </h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Connect your GitHub account and start analyzing your Kotlin projects
            in seconds.
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-10 py-4 rounded-full text-lg font-semibold hover:scale-[1.02] transition-all duration-200 shadow-xl hover:shadow-purple-500/25"
          >
            <span className="flex items-center space-x-2">
              <Github className="w-5 h-5" />
              <span>Connect GitHub Account</span>
            </span>
          </button>
        </div>
      </div>

      {/* KNIT:START */}
      {showKnitVisualizer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex">
          <div className="bg-white w-full h-full flex flex-col">
            {/* Header with controls */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Dependency Analysis
                </h2>
                {error && (
                  <div className="text-red-600 text-sm bg-red-50 px-3 py-1 rounded">
                    {error}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-4">
                {/* Show JSON toggle */}
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showJson}
                    onChange={(e) => setShowJson(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span>Show JSON</span>
                </label>
                <button
                  onClick={() => setShowKnitVisualizer(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Two panels side-by-side */}
              <div className="flex flex-1">
                {/* Before Panel */}
                <div className="flex-1 flex flex-col border-r border-gray-200">
                  <div className="p-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Before</h3>
                  </div>

                  {/* Before Graph */}
                  <div className="flex-1 min-h-[50vh] relative">
                    {beforeNodes.length > 0 && (
                      <ReactFlow
                        nodes={beforeNodes}
                        edges={beforeEdges}
                        fitView
                        className="bg-blue-50"
                      />
                    )}
                  </div>

                  {/* Before JSON */}
                  {showJson && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      <div className="p-2 text-xs font-semibold text-gray-600">
                        Input JSON
                      </div>
                      <pre className="p-3 text-xs bg-white mx-2 mb-2 rounded border overflow-auto max-h-32">
                        {JSON.stringify(dataJson, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* After Panel */}
                <div className="flex-1 flex flex-col">
                  <div className="p-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">After</h3>
                  </div>

                  {/* After Graph */}
                  <div className="flex-1 min-h-[50vh] relative">
                    {afterNodes.length > 0 ? (
                      <ReactFlow
                        nodes={afterNodes}
                        edges={afterEdges}
                        fitView
                        className="bg-green-50"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Click "Fix Dependencies" to see analysis results
                      </div>
                    )}
                  </div>

                  {/* After JSON */}
                  {showJson && apiResponse && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      <div className="p-2 text-xs font-semibold text-gray-600">
                        API Response JSON
                      </div>
                      <pre className="p-3 text-xs bg-white mx-2 mb-2 rounded border overflow-auto max-h-32">
                        {JSON.stringify(apiResponse, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Suggestions Panel */}
              <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
                <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    AI Suggestions
                  </h3>
                  {suggestions.length > 0 && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(
                            suggestions.join("\n• ")
                          )
                        }
                        className="text-xs text-gray-500 hover:text-purple-600 px-2 py-1 rounded hover:bg-purple-50"
                        title="Copy to clipboard"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => {
                          const content = `# Dependency Analysis Suggestions\n\n${suggestions
                            .map((s) => `• ${s}`)
                            .join(
                              "\n"
                            )}\n\n*Generated by TikTok Knit Dependency Analyzer*`;
                          const blob = new Blob([content], {
                            type: "text/markdown",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "knit-suggestions.md";
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="text-xs text-gray-500 hover:text-purple-600 px-2 py-1 rounded hover:bg-purple-50"
                        title="Export as Markdown"
                      >
                        💾
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                  {suggestions.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      <div className="text-4xl mb-2">🤖</div>
                      <p className="text-sm">
                        Run{" "}
                        <span className="font-medium text-purple-600">
                          Fix Dependencies
                        </span>{" "}
                        to get AI-generated suggestions.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {suggestions.map((suggestion, index) => (
                        <li
                          key={index}
                          className="flex gap-3 text-sm leading-5"
                        >
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shrink-0" />
                          <span className="text-gray-700">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* KNIT:END */}
    </div>
  );
}
