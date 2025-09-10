"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Wand2,
  Brain,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  GitCompare,
  FileCode,
  ArrowRight,
  Copy,
  Info,
} from "lucide-react";
import { useAtomValue } from "jotai";
import { ownerAtom, repoNameAtom } from "@/lib/atom/repoAtom";
import { graphAtom } from "@/lib/atom/graphAtom";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

export function AITab({
  onShowComparison,
  improvementResult: externalImprovementResult,
  showComparison,
  onToggleComparison,
}: {
  onShowComparison?: (result: any) => void;
  improvementResult?: any;
  showComparison?: boolean;
  onToggleComparison?: (show: boolean) => void;
}) {
  const [loadingImprovement, setLoadingImprovement] = useState(false);
  const [improvementResult, setImprovementResult] = useState<any>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const owner = useAtomValue(ownerAtom);
  const repoName = useAtomValue(repoNameAtom);
  const graph = useAtomValue(graphAtom);

  // Use external improvement result if provided, otherwise use local state
  const currentImprovementResult =
    externalImprovementResult || improvementResult;

  // Copy code to clipboard
  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      toast.error("Failed to copy code");
    }
  };

  // Get language from file extension
  const getLanguageFromFile = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "kt":
        return "kotlin";
      case "java":
        return "java";
      case "js":
      case "jsx":
        return "javascript";
      case "ts":
      case "tsx":
        return "typescript";
      case "py":
        return "python";
      case "cpp":
      case "cc":
      case "cxx":
        return "cpp";
      case "c":
        return "c";
      case "cs":
        return "csharp";
      case "go":
        return "go";
      case "rs":
        return "rust";
      case "php":
        return "php";
      case "rb":
        return "ruby";
      case "swift":
        return "swift";
      case "scala":
        return "scala";
      default:
        return "kotlin"; // Default to kotlin since your example is kotlin
    }
  };

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo: repoName,
          issue: "circular dependencies in DI graph",
        }),
      });

      if (!response.ok) {
        throw new Error(`Graph improvement failed: ${response.statusText}`);
      }

      const result = await response.json();

      console.log(result);

      if (!externalImprovementResult) {
        setImprovementResult(result);
      }
      onShowComparison?.(result);

      if (
        result.ok &&
        (!result.suggestions?.changes ||
          result.suggestions.changes.length === 0)
      ) {
        toast.success("Graph Analysis Complete", {
          description: "Your dependency graph is already well-structured!",
        });
      } else {
        toast.success("Graph Improvements Found", {
          description: "Check the suggestions below for recommended changes",
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

  const CodeDiffBlock = ({
    code,
    language,
    type,
    title,
  }: {
    code: string;
    language: string;
    type: "before" | "after";
    title: string;
  }) => {
    const isAfter = type === "after";
    const bgColor = isAfter ? "#f0f9f0" : "#fef2f2";
    const borderColor = isAfter ? "#22c55e" : "#ef4444";

    return (
      <div className="space-y-2">
        <div
          className={`text-sm font-medium flex items-center gap-2 ${
            isAfter ? "text-green-700" : "text-red-700"
          }`}
        >
          <span
            className={`w-3 h-3 rounded-full ${
              isAfter ? "bg-green-500" : "bg-red-500"
            }`}
          ></span>
          {title}
        </div>
        <div className="relative">
          <SyntaxHighlighter
            style={oneLight}
            language={language}
            PreTag="div"
            className="text-sm rounded-md border"
            showLineNumbers={false}
            wrapLines={true}
            customStyle={{
              margin: 0,
              padding: "12px",
              background: bgColor,
              border: `2px solid ${borderColor}`,
              borderRadius: "6px",
              fontSize: "13px",
              width: "360px",
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  };

  const renderCodeChange = (change: any, index: number) => {
    const language = getLanguageFromFile(change.file);

    return (
      <Card key={index} className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-600" />
              <span className="font-mono text-blue-800">{change.file}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(change.after, index)}
              className="h-6 px-2"
            >
              {copiedIndex === index ? (
                <CheckCircle className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Reason */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-md border border-amber-200">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">{change.reason}</p>
          </div>

          {/* Code Diff */}
          <div className="space-y-4">
            <CodeDiffBlock
              code={change.before}
              language={language}
              type="before"
              title="Before"
            />

            {/* Arrow */}
            <div className="flex justify-center py-1">
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>

            <CodeDiffBlock
              code={change.after}
              language={language}
              type="after"
              title="After"
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="bg-white/95 backdrop-blur-sm p-4 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={24} className="text-purple-600" />
            <div className="text-lg font-semibold text-gray-800">
              AI Analysis
            </div>
          </div>

          {/* Navigation Buttons */}
          {currentImprovementResult && (
            <div className="flex gap-2">
              {!showComparison ? (
                <Button
                  onClick={() => onToggleComparison?.(true)}
                  size="sm"
                  variant="default"
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  View Comparison
                </Button>
              ) : (
                <Button
                  onClick={() => onToggleComparison?.(false)}
                  size="sm"
                  variant="outline"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Original
                </Button>
              )}
            </div>
          )}
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
                  <div className="text-xs text-amber-600 text-center">
                    Please analyze the repository first to enable AI
                    improvements
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Results */}
        {currentImprovementResult && (
          <>
            {/* Status Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {currentImprovementResult.ok &&
                  (!currentImprovementResult.suggestions?.changes ||
                    currentImprovementResult.suggestions.changes.length ===
                      0) ? (
                    <CheckCircle size={20} className="text-green-600" />
                  ) : (
                    <AlertCircle size={20} className="text-blue-600" />
                  )}
                  Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800 font-medium">
                    Issue: {currentImprovementResult.issue}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Status:{" "}
                    {currentImprovementResult.ok
                      ? "Analysis Complete"
                      : "Issues Found"}
                  </div>
                </div>

                {/* Changes Summary */}
                {currentImprovementResult.suggestions?.changes &&
                  currentImprovementResult.suggestions.changes.length > 0 && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-sm text-green-800 font-medium">
                        {currentImprovementResult.suggestions.changes.length}{" "}
                        improvement
                        {currentImprovementResult.suggestions.changes.length !==
                        1
                          ? "s"
                          : ""}{" "}
                        suggested
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Review the code changes below to resolve circular
                        dependencies
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Code Changes */}
            {currentImprovementResult.suggestions?.changes &&
              currentImprovementResult.suggestions.changes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-semibold text-gray-800">
                      Suggested Code Changes
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {currentImprovementResult.suggestions.changes.map(
                      (change: any, index: number) =>
                        renderCodeChange(change, index)
                    )}
                  </div>

                  {/* Implementation Note */}
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-amber-800">
                            Implementation Tips
                          </div>
                          <div className="text-xs text-amber-700">
                            Apply these changes one at a time and test your
                            application after each change. The suggested
                            modifications focus on breaking circular
                            dependencies by adjusting visibility modifiers and
                            injection patterns.
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
