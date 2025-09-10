"use client";

import React, { useState } from "react";
import {
  Wand2,
  Brain,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  GitCompare,
  FileText,
  Code2,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";

interface Change {
  file: string;
  before: string;
  after: string;
  reason: string;
}

interface ImprovementResult {
  ok: boolean;
  issue: string;
  suggestions?: {
    changes: Change[];
  };
  status?: string;
  message?: string;
}

export function AITab({
  onShowComparison,
  improvementResult: externalImprovementResult,
  showComparison,
  onToggleComparison,
}: {
  onShowComparison?: (result: any) => void;
  improvementResult?: ImprovementResult;
  showComparison?: boolean;
  onToggleComparison?: (show: boolean) => void;
}) {
  const [loadingImprovement, setLoadingImprovement] = useState(false);
  const [improvementResult, setImprovementResult] =
    useState<ImprovementResult | null>(null);
  const [expandedChanges, setExpandedChanges] = useState<Set<number>>(
    new Set()
  );

  // Mock atoms for demo - replace with actual imports
  const owner = "demo-owner";
  const repoName = "demo-repo";
  const graph = true;

  // Use external improvement result if provided, otherwise use local state
  const currentImprovementResult =
    externalImprovementResult || improvementResult;

  const toggleChangeExpansion = (index: number) => {
    const newExpanded = new Set(expandedChanges);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedChanges(newExpanded);
  };

  // Mock improvement result for demo
  const mockResult: ImprovementResult = {
    ok: true,
    issue: "circular dependencies in DI graph",
    suggestions: {
      changes: [
        {
          file: "main/kotlin/knit/demo/MonitorComponent.kt",
          before:
            "class MonitorComponent(\n    @Provides val eventBus: EventBus,\n    @Provides val auditLogger: AuditLogger,\n    @Provides val performanceMonitor: PerformanceMonitor,\n    @Provides val objectGraphAnalyzer: ObjectGraphAnalyzer,\n)",
          after:
            "class MonitorComponent(\n    @Provides val eventBus: EventBus,\n    @Provides val auditLogger: AuditLogger,\n    @Provides val performanceMonitor: PerformanceMonitor\n) {\n    @Provides lateinit var objectGraphAnalyzer: ObjectGraphAnalyzer\n}",
          reason:
            "This change breaks the circular dependency by deferring the creation of ObjectGraphAnalyzer until the necessary dependencies are initialized.",
        },
        {
          file: "main/kotlin/knit/demo/CLI.kt",
          before:
            "class SampleCli(\n    @Component val storeComponent: MemoryStoreComponent,\n    @Component val monitorComponent: MonitorComponent,\n)",
          after:
            "class SampleCli(\n    @Component val storeComponent: MemoryStoreComponent,\n) {\n    private val monitorComponent: MonitorComponent by di\n}",
          reason:
            "Directly injecting the monitorComponent leads to circular dependencies. This change resolves the dependency by using lazy pattern instead.",
        },
      ],
    },
  };

  // Improve dependency graph using ChatGPT 4o.mini
  const improveGraph = async () => {
    if (!graph) {
      alert("No graph to improve. Please analyze the repository first.");
      return;
    }

    try {
      setLoadingImprovement(true);

      // Simulate API call for demo
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setImprovementResult(mockResult);
      onShowComparison?.(mockResult);

      alert("Graph improvements found! Check the suggestions below.");
    } catch (err) {
      alert("Graph improvement failed");
    } finally {
      setLoadingImprovement(false);
    }
  };

  const renderCodeBlock = (code: string) => (
    <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto font-mono whitespace-pre-wrap">
      <code>{code}</code>
    </pre>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="bg-white bg-opacity-95 p-4 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={24} className="text-purple-600" />
            <div className="text-lg font-semibold text-gray-800">
              AI Analysis
            </div>
          </div>

          {/* Navigation Buttons */}
          {(currentImprovementResult || mockResult) && (
            <div className="flex gap-2">
              {!showComparison ? (
                <button
                  onClick={() => onToggleComparison?.(true)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <GitCompare className="w-4 h-4" />
                  View Comparison
                </button>
              ) : (
                <button
                  onClick={() => onToggleComparison?.(false)}
                  className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Original
                </button>
              )}
            </div>
          )}
        </div>

        {/* AI Analysis Actions */}
        <div className="border rounded-lg bg-white shadow-sm">
          <div className="border-b p-4">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Wand2 className="w-5 h-5 text-purple-600" />
              AI-Powered Analysis
            </div>
          </div>
          <div className="p-4 space-y-4">
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

                <button
                  onClick={improveGraph}
                  disabled={loadingImprovement || !graph}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600 py-3 rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Wand2 className="w-4 h-4" />
                  {loadingImprovement
                    ? "AI is analyzing..."
                    : "Improve Graph with AI"}
                </button>

                {!graph && (
                  <div className="text-xs text-amber-600 text-center">
                    Please analyze the repository first to enable AI
                    improvements
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Results */}
        {(currentImprovementResult || mockResult) && (
          <div className="space-y-4">
            {/* Analysis Summary */}
            <div className="border rounded-lg bg-white shadow-sm">
              <div className="border-b p-4">
                <div className="flex items-center gap-2 text-base font-semibold">
                  {(currentImprovementResult || mockResult)?.ok ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  )}
                  Analysis Results
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      Issue Analyzed:
                    </span>
                  </div>
                  <div className="text-sm text-blue-700 ml-6">
                    {(currentImprovementResult || mockResult)?.issue ||
                      "General dependency analysis"}
                  </div>
                </div>

                {(currentImprovementResult || mockResult)?.suggestions
                  ?.changes ? (
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <div className="text-sm font-medium text-amber-900 mb-1">
                      Found{" "}
                      {
                        (currentImprovementResult || mockResult)?.suggestions
                          ?.changes?.length
                      }{" "}
                      suggested improvements
                    </div>
                    <div className="text-xs text-amber-700">
                      Review the detailed changes below to resolve circular
                      dependencies
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-700 font-medium">
                      {(currentImprovementResult || mockResult)?.message ||
                        "No issues found - your dependency graph looks good!"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Suggestions */}
            {(currentImprovementResult || mockResult)?.suggestions?.changes && (
              <div className="border rounded-lg bg-white shadow-sm">
                <div className="border-b p-4">
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <Code2 className="w-5 h-5 text-blue-600" />
                    Suggested Changes
                    <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                      {
                        (currentImprovementResult || mockResult)?.suggestions
                          ?.changes?.length
                      }
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {(
                    (currentImprovementResult || mockResult)?.suggestions
                      ?.changes || []
                  ).map((change, index) => (
                    <div
                      key={index}
                      className="border rounded-lg overflow-hidden"
                    >
                      <div
                        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleChangeExpansion(index)}
                      >
                        <div className="flex items-center gap-3">
                          {expandedChanges.has(index) ? (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          )}
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-sm text-gray-900">
                            {change.file}
                          </span>
                        </div>
                        <span className="px-2 py-1 text-xs border border-gray-300 text-gray-600 rounded">
                          Change {index + 1}
                        </span>
                      </div>

                      {expandedChanges.has(index) && (
                        <div className="p-4 space-y-4 bg-white">
                          {/* Reason */}
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="text-sm font-medium text-blue-900 mb-1">
                              Reason for change:
                            </div>
                            <div className="text-sm text-blue-700">
                              {change.reason}
                            </div>
                          </div>

                          {/* Before/After Code */}
                          <div className="space-y-3">
                            <div>
                              <div className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                Before (Current Code)
                              </div>
                              {renderCodeBlock(change.before)}
                            </div>

                            <div>
                              <div className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                After (Suggested Code)
                              </div>
                              {renderCodeBlock(change.after)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
