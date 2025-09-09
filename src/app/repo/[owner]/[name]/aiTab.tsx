"use client";

import React, { useState } from "react";
import { DependencyGraphProps } from "@/types/graphTypes";
import { RepoClientProps } from "@/types/repoTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Wand2,
  Brain,
  Lightbulb,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Eye,
} from "lucide-react";
import { useAtomValue } from "jotai";
import { inputNodesAtom, inputEdgesAtom } from "@/lib/graphAtom";

interface AITabProps extends RepoClientProps {
  graph: DependencyGraphProps | null;
  onShowComparison?: (result: any) => void;
}

export function AITab({ owner, name, graph, onShowComparison }: AITabProps) {
  const [loadingImprovement, setLoadingImprovement] = useState(false);
  const [improvementResult, setImprovementResult] = useState<any>(null);
  const inputNodes = useAtomValue(inputNodesAtom);
  const inputEdges = useAtomValue(inputEdgesAtom);

  // Improve dependency graph using ChatGPT 4o.mini
  const improveGraph = async () => {
    if (!graph) {
      toast.error("No graph to improve", {
        description: "Please analyze the repository first",
      });
      return;
    }

    try {
      setLoadingImprovement(true);

      const response = await fetch("/api/analyze/improve-graph", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodes: graph.nodes,
          edges: graph.edges,
          context: {
            owner,
            repo: name,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Graph improvement failed: ${response.statusText}`);
      }

      const result = await response.json();
      setImprovementResult(result);
      onShowComparison?.(result);

      if (result.status === "ok") {
        toast.success("Graph Analysis Complete", {
          description: "Your dependency graph is already well-structured!",
        });
      } else {
        toast.success("Graph Improvements Found", {
          description: "Check the comparison view for suggested improvements",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to improve graph";
      toast.error("Graph improvement failed", {
        description: errorMessage,
      });
    } finally {
      setLoadingImprovement(false);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="bg-white/95 backdrop-blur-sm p-4 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Brain size={24} className="text-purple-600" />
          <span className="text-lg font-semibold text-gray-800">
            AI Analysis
          </span>
        </div>

        {/* AI Analysis Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wand2 className="w-5 h-5 text-purple-600" />
              AI-Powered Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Use AI to analyze your dependency graph and get suggestions for
                improvements.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                  <Lightbulb className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-purple-900">
                      What AI analyzes:
                    </h4>
                    <ul className="text-xs text-purple-700 space-y-1">
                      <li>• Circular dependencies detection</li>
                      <li>• Unnecessary coupling identification</li>
                      <li>• Missing abstraction layers</li>
                      <li>• Dependency Inversion Principle violations</li>
                      <li>• Modularization suggestions</li>
                    </ul>
                  </div>
                </div>

                <Button
                  onClick={improveGraph}
                  disabled={loadingImprovement || !graph}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {loadingImprovement
                    ? "AI is analyzing..."
                    : "Improve Graph with AI"}
                </Button>

                {!graph && (
                  <p className="text-xs text-amber-600 text-center">
                    Please analyze the repository first to enable AI
                    improvements
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Results */}
        {improvementResult && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {improvementResult.status === "ok" ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-green-600" />
                )}
                Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 font-medium">
                  {improvementResult.message}
                </p>
              </div>

              {improvementResult.improvedGraph && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    Improved Graph Info:
                  </h4>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>
                      Nodes:{" "}
                      {improvementResult.improvedGraph.nodes?.length || 0}
                    </div>
                    <div>
                      Edges:{" "}
                      {improvementResult.improvedGraph.edges?.length || 0}
                    </div>
                  </div>
                </div>
              )}

              {improvementResult.suggestions &&
                improvementResult.suggestions.length > 0 && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <h4 className="text-sm font-medium text-orange-900 mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      AI Suggestions:
                    </h4>
                    <ul className="space-y-2 text-xs text-orange-700">
                      {improvementResult.suggestions.map(
                        (suggestion: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="w-1 h-1 bg-orange-400 rounded-full mt-2 flex-shrink-0"></span>
                            <span>{suggestion}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
