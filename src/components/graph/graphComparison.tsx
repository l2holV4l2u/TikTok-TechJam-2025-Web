"use client";

import React from "react";
import { ImprovedDependencyGraph } from "./improvedGraph";
import { GraphNode, GraphEdge } from "@/types/graphTypes";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { CheckCircle } from "lucide-react";

interface GraphComparisonProps {
  status: "ok" | "improved";
  message: string;
  improvedGraph?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  suggestions?: string[];
}

export const GraphComparison: React.FC<GraphComparisonProps> = ({
  status,
  message,
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
              <h4 className="font-medium text-gray-900 mb-2">
                General Recommendations:
              </h4>
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
    <div className="w-full h-full">
      {improvedGraph && (
        <ImprovedDependencyGraph
          nodes={improvedGraph.nodes}
          edges={improvedGraph.edges}
          className="h-full"
        />
      )}
    </div>
  );
};
