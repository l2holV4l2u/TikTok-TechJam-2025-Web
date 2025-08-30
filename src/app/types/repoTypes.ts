import { FileNode } from "@/lib/tree";

export type RepoClientProps = {
  owner: string;
  name: string;
};

export type FileTreeResponse = {
  tree: FileNode[];
  truncated: boolean;
  defaultBranch: string;
  totalFiles: number;
};

export type FileContentResponse = {
  content: string | null;
  base64Content: string;
  size: number;
  path: string;
  mimeType: string;
  isBinary: boolean;
  isText: boolean;
  sha: string;
  downloadUrl: string;
};
