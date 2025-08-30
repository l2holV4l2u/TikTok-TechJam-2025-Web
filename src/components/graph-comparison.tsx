"use client";

import React from "react";
import { DependencyGraph } from "./graph";
import { GraphNode, GraphEdge } from "@/app/types/graphTypes";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

interface GraphComparisonProps {
  status: "ok" | "improved";
  message: string;
  originalGraph?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  improvedGraph?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  suggestions?: string[];
}

export const GraphComparison: React.FC<GraphComparisonProps> = ({
  status,
  message,
  originalGraph,
  improvedGraph,
  suggestions = [],
}) => {
  if (status === "ok") {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            Dependency Graph Analysis: OK
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">{message}</p>
          {suggestions.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">General Recommendations:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                {suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <AlertCircle className="w-5 h-5" />
            Dependency Graph Analysis: Improvements Suggested
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">{message}</p>
          {suggestions.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Suggested Improvements:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                {suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-96">
        {/* Original Graph */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
              Current Graph
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {originalGraph?.nodes.length || 0} nodes, {originalGraph?.edges.length || 0} edges
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-2">
            {originalGraph && (
              <DependencyGraph
                nodes={originalGraph.nodes}
                edges={originalGraph.edges}
                className="h-full border rounded"
              />
            )}
          </CardContent>
        </Card>

        {/* Improved Graph */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Improved Graph
              <span className="text-xs bg-green-100 px-2 py-1 rounded">
                {improvedGraph?.nodes.length || 0} nodes, {improvedGraph?.edges.length || 0} edges
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-2">
            {improvedGraph && (
              <DependencyGraph
                nodes={improvedGraph.nodes}
                edges={improvedGraph.edges}
                className="h-full border rounded"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
