"use client"

import { useState, useEffect } from "react"
import { Session } from "next-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileNode } from "@/lib/tree"
import { getLanguageFromExtension, getFileExtension } from "@/lib/tree"
import { formatBytes } from "@/lib/github"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism"
import { 
  Github, 
  Folder, 
  File, 
  ArrowLeft, 
  Download,
  Eye,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Copy,
  Check
} from "lucide-react"
import Link from "next/link"

interface RepoClientProps {
  session: Session
  owner: string
  name: string
}

interface FileTreeResponse {
  tree: FileNode[]
  truncated: boolean
  defaultBranch: string
  totalFiles: number
}

interface FileContentResponse {
  content: string | null
  base64Content: string
  size: number
  path: string
  mimeType: string
  isBinary: boolean
  isText: boolean
  sha: string
  downloadUrl: string
}

export default function RepoClient({ session, owner, name }: RepoClientProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(true) // loading tree
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<FileContentResponse | null>(null)
  const [loadingFile, setLoadingFile] = useState(false) // loading file content
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())


  const repoFullName = `${owner}/${name}`
  const fetchFileTree = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/github/repo-tree?owner=${owner}&repo=${name}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch repository tree: ${response.statusText}`)
      }
      
      const data: FileTreeResponse = await response.json()
      setFileTree(data.tree)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch repository tree")
    } finally {
      setLoading(false)
    }
  }

  const fetchFileContent = async (path: string, sha: string) => {
    try {
      setLoadingFile(true)
      const response = await fetch(`/api/github/file?owner=${owner}&repo=${name}&sha=${sha}&path=${encodeURIComponent(path)}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file content: ${response.statusText}`)
      }
      
      const data: FileContentResponse = await response.json()
      setFileContent(data)
      setSelectedFile(path)
      console.log(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch file content")
    } finally {
      setLoadingFile(false)
    }
  }

  useEffect(() => {
    fetchFileTree()
  }, [owner, name])

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  // const copyToClipboard = async () => {
  //   if (fileContent?.content) {
  //     await navigator.clipboard.writeText(fileContent.content)
  //     setCopied(true)
  //     setTimeout(() => setCopied(false), 2000)
  //   }
  // }

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 py-1 px-2 hover:bg-gray-100 cursor-pointer rounded text-sm ${
            selectedFile === node.path ? "bg-blue-100 text-blue-700" : ""
          }`}
          style={{ paddingLeft: `${(depth + 1) * 12}px` }}
          onClick={() => {
            if (node.type === "folder") {
              toggleFolder(node.path)
            } else {
              fetchFileContent(node.path, node.sha!)
            }
          }}
        >
          {node.type === "folder" ? (
            <>
              {expandedFolders.has(node.path) ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <Folder className="w-4 h-4 text-blue-500" />
            </>
          ) : (
            <>
              <div className="w-4" />
              <File className="w-4 h-4 text-gray-500" />
            </>
          )}
          <span className="flex-1">{node.name}</span>
          {node.type === "file" && node.size && (
            <span className="text-xs text-gray-400">{formatBytes(node.size)}</span>
          )}
        </div>
        
        {node.type === "folder" && node.children && expandedFolders.has(node.path) && (
          <div>
            {renderFileTree(node.children, depth + 1)}
          </div>
        )}
      </div>
    ))
  }

  // const renderFileContent = () => {
  //   if (!fileContent) return null

  //   if (fileContent.isBinary || !fileContent.isText) {
  //     return (
  //       <div className="p-8 text-center">
  //         <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
  //         <h3 className="text-lg font-medium text-gray-900 mb-2">
  //           Binary file or preview not supported
  //         </h3>
  //         <p className="text-gray-600 mb-4">
  //           This file type cannot be displayed in the browser.
  //         </p>
  //         <Button asChild>
  //           <a href={fileContent.downloadUrl} target="_blank" rel="noopener noreferrer">
  //             <Download className="w-4 h-4 mr-2" />
  //             Download file
  //           </a>
  //         </Button>
  //       </div>
  //     )
  //   }

  //   const extension = getFileExtension(fileContent.path)
  //   const language = getLanguageFromExtension(extension)
  //   const isMarkdown = extension === 'md' || extension === 'markdown'

  //   return (
  //     <div className="h-full flex flex-col">
  //       <div className="flex items-center justify-between p-4 border-b bg-gray-50">
  //         <div className="flex items-center gap-2">
  //           <File className="w-5 h-5 text-gray-500" />
  //           <span className="font-medium">{fileContent.path}</span>
  //           <span className="text-sm text-gray-500">
  //             {formatBytes(fileContent.size)}
  //           </span>
  //         </div>
  //         <div className="flex items-center gap-2">
  //           <Button variant="outline" size="sm" onClick={copyToClipboard}>
  //             {copied ? (
  //               <Check className="w-4 h-4 mr-2" />
  //             ) : (
  //               <Copy className="w-4 h-4 mr-2" />
  //             )}
  //             {copied ? "Copied!" : "Copy"}
  //           </Button>
  //           <Button variant="outline" size="sm" asChild>
  //             <a href={fileContent.downloadUrl} target="_blank" rel="noopener noreferrer">
  //               <Download className="w-4 h-4 mr-2" />
  //               Download
  //             </a>
  //           </Button>
  //         </div>
  //       </div>
        
  //       <ScrollArea className="flex-1">
  //         <div className="p-0">
  //           {isMarkdown ? (
  //             <div className="prose max-w-none p-6">
  //               {/* You could add a markdown renderer here */}
  //               <pre className="whitespace-pre-wrap text-sm">
  //                 {fileContent.content}
  //               </pre>
  //             </div>
  //           ) : (
  //             <SyntaxHighlighter
  //               language={language}
  //               style={oneLight}
  //               showLineNumbers={true}
  //               wrapLines={true}
  //               customStyle={{
  //                 margin: 0,
  //                 fontSize: '14px',
  //                 lineHeight: '1.5',
  //               }}
  //             >
  //               {fileContent.content || ""}
  //             </SyntaxHighlighter>
  //           )}
  //         </div>
  //       </ScrollArea>
  //     </div>
  //   )
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            
            <div className="flex items-center gap-2">
              <Github className="w-6 h-6 text-gray-800" />
              <h1 className="text-xl font-semibold text-gray-900">
                {repoFullName}
              </h1>
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={`https://github.com/${repoFullName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
              <Button 
                variant="outline" 
                onClick={fetchFileTree}
                className="mt-2"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* File Tree */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="w-5 h-5" />
                Files
              </CardTitle>
              <CardDescription>
                Browse repository files and folders
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="p-2">
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 px-2">
                        <Skeleton className="w-4 h-4" />
                        <Skeleton className="h-4 flex-1" />
                      </div>
                    ))
                  ) : fileTree.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No files found in this repository
                    </div>
                  ) : (
                    renderFileTree(fileTree)
                  )}
                </div>
            </CardContent>
          </Card>

          {/* File Content */}
          {/* <Card className="lg:col-span-2">
            <CardContent className="p-0 h-full">
              {loadingFile ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading file content...</p>
                  </div>
                </div>
              ) : selectedFile && fileContent ? (
                renderFileContent()
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select a file to view
                    </h3>
                    <p className="text-gray-600">
                      Click on any file in the tree to view its contents
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card> */}
        </div>
      </div>
    </div>
  )
}
