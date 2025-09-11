"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizonal, Bot, User, Loader2 } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneLight,
  oneDark,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAtomValue, useAtom } from "jotai";
import { ownerAtom, repoNameAtom } from "@/lib/atom/repoAtom";
import { cn } from "@/lib/utils";
import { atomWithStorage } from "jotai/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type ChatState = {
  messages: Message[];
  indexStatus: {
    indexed: boolean;
    totalChunks?: number;
  } | null;
  hasAutoIndexed: boolean;
};

// Create persistent atoms for chat state
const chatStateAtom = atomWithStorage<Record<string, ChatState>>(
  "ai-chat-state",
  {}
);

export function AITab() {
  const owner = useAtomValue(ownerAtom);
  const repoName = useAtomValue(repoNameAtom);
  const [chatStates, setChatStates] = useAtom(chatStateAtom);

  const repoKey = `${owner}/${repoName}`;
  const currentChatState = chatStates[repoKey] || {
    messages: [],
    indexStatus: null,
    hasAutoIndexed: false,
  };

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoIndexing, setAutoIndexing] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Update chat state for current repository
  const updateChatState = (updates: Partial<ChatState>) => {
    setChatStates((prev) => ({
      ...prev,
      [repoKey]: {
        ...currentChatState,
        ...updates,
      },
    }));
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentChatState.messages, loading]);

  // Auto-index when repository changes (only if not already indexed)
  useEffect(() => {
    if (repoKey && !currentChatState.hasAutoIndexed) {
      checkIndexStatusAndAutoIndex();
    }
  }, [owner, repoName]);

  const checkIndexStatusAndAutoIndex = async () => {
    try {
      const statusResponse = await fetch(
        `/api/analyze/chat?owner=${owner}&repo=${repoName}`
      );

      if (statusResponse.ok) {
        const status = await statusResponse.json();

        updateChatState({
          indexStatus: status,
          hasAutoIndexed: true,
        });

        if (!status.indexed) {
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

            const newMessage: Message = {
              role: "assistant",
              content: `Repository ${owner}/${repoName} has been automatically indexed with ${result.indexed} code chunks! You can now ask me questions about your codebase.`,
              timestamp: Date.now(),
            };

            updateChatState({
              indexStatus: { indexed: true, totalChunks: result.indexed },
              messages: [...currentChatState.messages, newMessage],
            });
          } else {
            console.error("Auto-indexing failed:", result.error);

            const errorMessage: Message = {
              role: "assistant",
              content: `Failed to auto-index repository: ${result.error}. Please check that your repository is accessible at the expected location.`,
              timestamp: Date.now(),
            };

            updateChatState({
              messages: [...currentChatState.messages, errorMessage],
            });
          }
        } else {
          // Only add welcome message if there are no existing messages
          if (currentChatState.messages.length === 0) {
            const welcomeMessage: Message = {
              role: "assistant",
              content: `Welcome back! Repository ${owner}/${repoName} is already indexed with ${
                status.totalChunks || "multiple"
              } code chunks. Feel free to ask me questions about your codebase!`,
              timestamp: Date.now(),
            };

            updateChatState({
              messages: [welcomeMessage],
            });
          }
        }
      }
    } catch (error) {
      console.error("Auto-index check failed:", error);

      const errorMessage: Message = {
        role: "assistant",
        content: `Unable to check repository index status. Please ensure your repository is accessible at the expected location.`,
        timestamp: Date.now(),
      };

      updateChatState({
        messages: [...currentChatState.messages, errorMessage],
        hasAutoIndexed: true,
      });
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

    // Add user message immediately
    updateChatState({
      messages: [...currentChatState.messages, userMessage],
    });

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
          : data?.answer || "No answer received.",
        timestamp: Date.now(),
      };

      // Add assistant message
      updateChatState({
        messages: [...currentChatState.messages, userMessage, assistantMessage],
      });
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: Message = {
        role: "assistant",
        content: `Failed to contact AI service: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        timestamp: Date.now(),
      };

      updateChatState({
        messages: [...currentChatState.messages, userMessage, errorMessage],
      });
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
        className={cn("flex gap-3 mb-6", isUser ? "flex-row-reverse" : "")}
      >
        {/* Avatar */}
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            isUser
              ? "bg-gradient-to-br from-purple-700 to-pink-500 text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Message Content */}
        <div
          className={cn(
            "flex-1 max-w-[85%] min-w-0",
            isUser ? "text-right" : ""
          )}
        >
          <div
            className={cn(
              "inline-block rounded-lg px-4 py-3 max-w-full break-words",
              isUser
                ? "bg-gradient-to-br from-purple-700 to-pink-500 text-white rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"
            )}
          >
            <div className="space-y-2 overflow-hidden">
              {parts.map((part, idx) =>
                typeof part === "string" ? (
                  <div
                    key={idx}
                    className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere"
                  >
                    {part}
                  </div>
                ) : (
                  <div key={idx} className="my-3 overflow-hidden">
                    <div className="overflow-x-auto">
                      <SyntaxHighlighter
                        language={part.lang}
                        style={isUser ? oneDark : oneLight}
                        customStyle={{
                          margin: 0,
                          padding: "12px",
                          borderRadius: "6px",
                          fontSize: "13px",
                          backgroundColor: isUser ? "#1e1e1e" : "#f8f9fa",
                          width: "300px",
                        }}
                        wrapLongLines={false}
                      >
                        {part.code}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2 px-1">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  const EmptyState = () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
          <Bot className="w-6 h-6 text-muted-foreground" />
        </div>
        {autoIndexing ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Setting up AI analysis for your repository...
            </p>
            <p className="text-xs text-muted-foreground">
              This will just take a moment
            </p>
          </div>
        ) : currentChatState.indexStatus?.indexed ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Repository is ready! Ask me anything about your code
            </p>
            <p className="text-xs text-muted-foreground">
              Try: "Show me circular dependencies" or "Explain the architecture"
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Start a conversation about your repository
            </p>
            <p className="text-xs text-muted-foreground">
              Try: "Show me circular dependencies" or "Explain the architecture"
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const LoadingIndicator = () => (
    <div className="flex gap-3 mb-4 justify-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        <Bot size={16} className="text-muted-foreground" />
      </div>
      <div className="max-w-[80%]">
        <div className="bg-card text-card-foreground border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">AI is analyzing...</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background p-6">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <h2 className="text-lg font-semibold">AI Repository Chat</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Ask questions about {owner}/{repoName}
        </p>
      </div>

      {/* Auto-indexing Status */}
      {autoIndexing && (
        <div className="flex-shrink-0 bg-blue-50 border-b border-blue-200 p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <Loader2 className="w-4 h-4 animate-spin" />
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
      <div className="flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto px-6 py-4">
          {currentChatState.messages.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {currentChatState.messages.map((message, index) =>
                renderMessage(message, index)
              )}
              {loading && <LoadingIndicator />}
            </>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t bg-background p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                autoIndexing
                  ? "Please wait while repository is being indexed..."
                  : "Ask about your repository (e.g., 'Show me circular dependencies' or 'Explain the architecture')"
              }
              className="min-h-[44px] max-h-[120px] resize-none"
              disabled={loading || autoIndexing}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={loading || autoIndexing || !input.trim()}
            size="icon"
            className="h-[44px] w-[44px]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <SendHorizonal className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
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
