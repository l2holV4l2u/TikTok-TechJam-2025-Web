import React from "react";

interface GraphLegendProps {
  showCycles: boolean;
  showHeavyNodes: boolean;
  showLongestPath: boolean;
  showCriticalNodes: boolean;
}

export const GraphLegend: React.FC<GraphLegendProps> = ({
  showCycles,
  showHeavyNodes,
  showLongestPath,
  showCriticalNodes,
}) => {
  return (
    <div className="absolute bottom-4 right-4 z-20">
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg rounded-lg p-3">
        <div className="text-xs font-medium text-gray-800 mb-2">Legend</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-blue-500 bg-blue-100"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-green-500 bg-green-100"></div>
            <span>Dependencies</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-orange-500 bg-orange-100"></div>
            <span>Dependents</span>
          </div>
          {showCycles && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border-2 border-red-500 bg-red-100"></div>
              <span>In Cycle</span>
            </div>
          )}
          {showHeavyNodes && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border-2 border-purple-500 bg-purple-100"></div>
              <span>Heavy Node</span>
            </div>
          )}
          {showLongestPath && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border-2 border-blue-500 bg-blue-100"></div>
              <span>Longest Path</span>
            </div>
          )}
          {showCriticalNodes && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border-2 border-amber-500 bg-amber-100"></div>
              <span>Critical Node</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
