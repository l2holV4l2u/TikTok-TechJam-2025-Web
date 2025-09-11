// src/components/AITab.tsx - Clean version with auto-indexing, no manual button
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizonal, Bot, User } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneLight,
  oneDark,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAtomValue } from "jotai";
import { ownerAtom, repoNameAtom } from "@/lib/atom/repoAtom";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export function AITab() {
  const owner = useAtomValue(ownerAtom);
  const repoName = useAtomValue(repoNameAtom);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoIndexing, setAutoIndexing] = useState(false);
  const [indexStatus, setIndexStatus] = useState<{
    indexed: boolean;
    totalChunks?: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hasAttemptedAutoIndex = useRef<string>("");

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Auto-index when repository changes
  useEffect(() => {
    const repoKey = owner && repoName ? `${owner}/${repoName}` : "";

    if (repoKey && hasAttemptedAutoIndex.current !== repoKey) {
      hasAttemptedAutoIndex.current = repoKey;
      setMessages([]); // Clear messages when switching repos
      checkIndexStatusAndAutoIndex();
    }
  }, [owner, repoName]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const checkIndexStatusAndAutoIndex = async () => {
    if (!owner || !repoName) return;

    try {
      // First check if already indexed
      const statusResponse = await fetch(
        `/api/analyze/chat?owner=${encodeURIComponent(
          owner
        )}&repo=${encodeURIComponent(repoName)}`
      );

      if (statusResponse.ok) {
        const status = await statusResponse.json();
        setIndexStatus(status);

        if (!status.indexed) {
          // Auto-start indexing
          console.log(`Auto-indexing repository: ${owner}/${repoName}`);
          setAutoIndexing(true);

          const indexResponse = await fetch("/api/analyze/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ owner, repo: repoName }),
          });

          const result = await indexResponse.json();

          if (result.success) {
            console.log(
              `Auto-indexing completed: ${result.indexed} chunks indexed`
            );
            setIndexStatus({ indexed: true, totalChunks: result.indexed });

            // Add a system message to inform user
            setMessages([
              {
                role: "assistant",
                content: `🎉 Repository ${owner}/${repoName} has been automatically indexed with ${result.indexed} code chunks! You can now ask me questions about your codebase.`,
                timestamp: Date.now(),
              },
            ]);
          } else {
            console.error("Auto-indexing failed:", result.error);
            setMessages([
              {
                role: "assistant",
                content: `⚠️ Failed to auto-index repository: ${result.error}. Please check that your repository is accessible at the expected location.`,
                timestamp: Date.now(),
              },
            ]);
          }
        } else {
          // Already indexed, welcome user
          setMessages([
            {
              role: "assistant",
              content: `👋 Welcome! Repository ${owner}/${repoName} is already indexed with ${
                status.totalChunks || "multiple"
              } code chunks. Feel free to ask me questions about your codebase!`,
              timestamp: Date.now(),
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Auto-index check failed:", error);
      setMessages([
        {
          role: "assistant",
          content: `⚠️ Unable to check repository index status. Please ensure your repository is accessible at the expected location.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setAutoIndexing(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/analyze/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo: repoName,
          question: userMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data?.error
          ? `Error: ${data.error}`
          : data?.answer || "⚠️ No answer received.",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: Message = {
        role: "assistant",
        content: `⚠️ Failed to contact AI service: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const parts = parseMessageContent(message.content);
    const isUser = message.role === "user";

    return (
      <div
        key={index}
        className={`flex gap-3 mb-4 ${isUser ? "flex-row-reverse" : ""}`}
      >
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600"
          }`}
        >
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Message Content */}
        <div className={`flex-1 max-w-[80%] ${isUser ? "text-right" : ""}`}>
          <div
            className={`inline-block rounded-2xl px-4 py-2 ${
              isUser
                ? "bg-purple-600 text-white rounded-br-sm"
                : "bg-gray-100 text-gray-900 rounded-bl-sm"
            }`}
          >
            {parts.map((part, idx) =>
              typeof part === "string" ? (
                <div
                  key={idx}
                  className="text-sm whitespace-pre-wrap break-words"
                  style={{ wordBreak: "break-word" }}
                >
                  {part}
                </div>
              ) : (
                <div key={idx} className="my-2">
                  <SyntaxHighlighter
                    language={part.lang}
                    style={isUser ? oneDark : oneLight}
                    customStyle={{
                      margin: 0,
                      padding: "12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      backgroundColor: isUser ? "#1e1e1e" : "#f8f9fa",
                    }}
                  >
                    {part.code}
                  </SyntaxHighlighter>
                </div>
              )
            )}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  // Check if repo is selected
  if (!owner || !repoName) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <div className="text-center text-gray-500">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Please select a repository to start chatting</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          AI Repository Chat
        </CardTitle>
        <p className="text-sm text-gray-600">
          Ask questions about {owner}/{repoName}
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 flex-1 min-h-0">
        {/* Auto-indexing Status */}
        {autoIndexing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
            <div className="flex items-center gap-2 text-blue-800">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">
                Auto-indexing repository...
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              This may take a minute. Your repository is being processed for AI
              analysis.
            </p>
          </div>
        )}

        {/* Messages Area */}
        <ScrollArea ref={scrollRef} className="flex-1 pr-2">
          <div className="min-h-full">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  {autoIndexing ? (
                    <>
                      <p className="text-sm">
                        Setting up AI analysis for your repository...
                      </p>
                      <p className="text-xs mt-1">
                        This will just take a moment
                      </p>
                    </>
                  ) : indexStatus?.indexed ? (
                    <>
                      <p className="text-sm">
                        Repository is ready! Ask me anything about your code
                      </p>
                      <p className="text-xs mt-1">
                        Try: "Show me circular dependencies" or "Explain the
                        architecture"
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm">
                        Start a conversation about your repository
                      </p>
                      <p className="text-xs mt-1">
                        Try: "Show me circular dependencies" or "Explain the
                        architecture"
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              messages.map((message, index) => renderMessage(message, index))
            )}

            {loading && (
              <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-500">
                      <div className="flex gap-1">
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                      <span className="text-sm ml-2">AI is analyzing...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                autoIndexing
                  ? "Please wait while repository is being indexed..."
                  : "Ask about your repository (e.g., 'Show me circular dependencies' or 'Explain the architecture')"
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[40px] max-h-[120px]"
              rows={1}
              disabled={loading || autoIndexing}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={loading || autoIndexing || !input.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            size="sm"
          >
            <SendHorizonal className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to parse message content with code blocks
function parseMessageContent(
  content?: string
): (string | { lang: string; code: string })[] {
  if (!content) return [];

  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  const parts: (string | { lang: string; code: string })[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textPart = content.slice(lastIndex, match.index).trim();
      if (textPart) parts.push(textPart);
    }

    parts.push({
      lang: match[1] || "kotlin",
      code: match[2].trim(),
    });

    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) parts.push(remaining);
  }

  if (parts.length === 0) {
    parts.push(content);
  }

  return parts;
}
