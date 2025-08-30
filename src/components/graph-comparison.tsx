"use client";

import React, { useState } from "react";
import { DependencyGraph } from "./graph";
import { GraphNode, GraphEdge } from "@/app/types/graphTypes";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { CheckCircle, AlertCircle, ArrowLeft, Eye, X, EyeOff } from "lucide-react";

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
  onViewOriginal?: () => void;
  onViewImproved?: () => void;
}

export const GraphComparison: React.FC<GraphComparisonProps> = ({
  status,
  message,
  originalGraph,
  improvedGraph,
  suggestions = [],
  onViewOriginal,
  onViewImproved,
}) => {
  const [suggestionsVisible, setSuggestionsVisible] = useState(true);

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
    <div className="relative w-full h-full flex flex-col">
      {/* Header with back button */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewOriginal}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Original
          </Button>
          <div className="flex items-center gap-2 text-green-700">
            <AlertCircle className="w-5 h-5" />
            <h2 className="text-lg font-medium">Improved Dependency Graph</h2>
          </div>
          <span className="text-sm bg-green-100 px-3 py-1 rounded text-green-700">
            {improvedGraph?.nodes.length || 0} nodes, {improvedGraph?.edges.length || 0} edges
          </span>
        </div>
        
        {suggestions.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSuggestionsVisible(!suggestionsVisible)}
            className="bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-300"
          >
            <AlertCircle className="w-4 h-4 mr-1" />
            {suggestionsVisible ? 'Hide Suggestions' : 'Show Suggestions'}
          </Button>
        )}
      </div>

      {/* Main content area with graph and sticky suggestions */}
      <div className="relative flex-1 flex">
        {/* Improved Graph - Full width */}
        <div className="flex-1">
          {improvedGraph && (
            <DependencyGraph
              nodes={improvedGraph.nodes}
              edges={improvedGraph.edges}
              className="h-full"
            />
          )}
        </div>

        {/* Sticky Suggestions Box */}
        {suggestions.length > 0 && suggestionsVisible && (
          <div className="fixed top-20 right-4 z-10">
            <Card className="w-80 max-h-96 shadow-lg border-orange-200 bg-orange-50/95 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    AI Suggestions
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSuggestionsVisible(false)}
                    className="h-6 w-6 p-0 hover:bg-orange-100"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-orange-700 mb-3 font-medium">{message}</p>
                <div className="max-h-48 overflow-y-auto">
                  <ul className="space-y-2 text-xs text-orange-600">
                    {suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2 leading-relaxed">
                        <span className="w-1 h-1 bg-orange-400 rounded-full mt-2 flex-shrink-0"></span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
