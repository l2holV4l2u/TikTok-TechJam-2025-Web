import { GitHubTreeItem } from "@/lib/github"

export interface FileNode {
  name: string
  path: string
  type: "file" | "folder"
  sha?: string
  size?: number
  children?: FileNode[]
}

export function buildFileTree(items: GitHubTreeItem[]): FileNode[] {
  const root: FileNode[] = []
  const pathMap = new Map<string, FileNode>()

  // Sort items by path to ensure parent folders are processed first
  const sortedItems = items
    .filter(item => item.type === "blob") // Only include files, not tree objects
    .sort((a, b) => a.path.localeCompare(b.path))

  for (const item of sortedItems) {
    const pathParts = item.path.split("/")
    let currentPath = ""
    let currentLevel = root

    // Create all parent folders if they don't exist
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i]
      const isFile = i === pathParts.length - 1
      currentPath = currentPath ? `${currentPath}/${part}` : part

      // Check if this path already exists
      let existingNode = pathMap.get(currentPath)
      
      if (!existingNode) {
        // Create new node
        const newNode: FileNode = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "folder",
          ...(isFile && { sha: item.sha, size: item.size }),
          ...(!isFile && { children: [] })
        }

        pathMap.set(currentPath, newNode)
        currentLevel.push(newNode)
        existingNode = newNode
      }

      if (!isFile && existingNode.children) {
        currentLevel = existingNode.children
      }
    }
  }

  return sortFileTree(root)
}

function sortFileTree(nodes: FileNode[]): FileNode[] {
  return nodes
    .sort((a, b) => {
      // Folders first, then files
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1
      }
      // Alphabetical within same type
      return a.name.localeCompare(b.name)
    })
    .map(node => ({
      ...node,
      children: node.children ? sortFileTree(node.children) : undefined
    }))
}

export function findFileInTree(tree: FileNode[], path: string): FileNode | null {
  for (const node of tree) {
    if (node.path === path) {
      return node
    }
    if (node.children) {
      const found = findFileInTree(node.children, path)
      if (found) return found
    }
  }
  return null
}

export function getFlatFileList(tree: FileNode[]): FileNode[] {
  const result: FileNode[] = []
  
  function traverse(nodes: FileNode[]) {
    for (const node of nodes) {
      if (node.type === "file") {
        result.push(node)
      }
      if (node.children) {
        traverse(node.children)
      }
    }
  }
  
  traverse(tree)
  return result
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}

export function getLanguageFromExtension(extension: string): string {
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'css': 'css',
    'html': 'html',
    'xml': 'xml',
    'json': 'json',
    'md': 'markdown',
    'markdown': 'markdown',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'dockerfile': 'dockerfile',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'r': 'r',
    'dart': 'dart',
    'vue': 'vue',
    'svelte': 'svelte',
  }
  
  return languageMap[extension] || 'text'
}
