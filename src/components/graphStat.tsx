import React from "react";
import { Layers } from "lucide-react";
import { GraphAnalysis } from "@/app/types/graphTypes";

export const GraphStats: React.FC<{ analysis: GraphAnalysis }> = ({
  analysis,
}) => {
  return (
    <div className="absolute top-4 right-4 z-20">
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-800">
            Graph Health
          </span>
        </div>

        <div className="space-y-1 text-xs">
          <div
            className={`flex items-center gap-2 ${
              analysis.cycles.cycles.length === 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                analysis.cycles.cycles.length === 0
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />
            <span>
              Cycles:{" "}
              {analysis.cycles.cycles.length === 0
                ? "None"
                : analysis.cycles.cycles.length}
            </span>
          </div>

          <div
            className={`flex items-center gap-2 ${
              analysis.isolatedNodes.length === 0
                ? "text-green-600"
                : "text-yellow-600"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                analysis.isolatedNodes.length === 0
                  ? "bg-green-500"
                  : "bg-yellow-500"
              }`}
            />
            <span>Isolated: {analysis.isolatedNodes.length}</span>
          </div>

          <div className="flex items-center gap-2 text-blue-600">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Depth: {analysis.maxDepth}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
