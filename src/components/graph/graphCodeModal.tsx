import { formatFileSize } from "@/utils/graphUtils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export function CodeModal({
  isOpen,
  onClose,
  nodeId,
  content,
  isLoading,
  fileInfo,
}: {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  content: string;
  isLoading: boolean;
  fileInfo?: {
    path: string;
    size: number;
    mimeType: string;
    isBinary: boolean;
  };
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-left">
            <div className="flex flex-col gap-1">
              <span>Code: {nodeId}</span>
              {fileInfo && (
                <div className="text-sm font-normal text-muted-foreground flex items-center gap-4">
                  <span>{fileInfo.path}</span>
                  <span>{formatFileSize(fileInfo.size)}</span>
                  <span>{fileInfo.mimeType}</span>
                  {fileInfo.isBinary && (
                    <span className="text-orange-600">Binary</span>
                  )}
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2">Loading file content...</span>
            </div>
          ) : (
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
              <code>{content}</code>
            </pre>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
          {!isLoading && content && (
            <Button
              variant="highlight"
              size="sm"
              onClick={() => {
                navigator.clipboard
                  .writeText(content)
                  .then(() => {
                    toast.success("Code copied to clipboard!");
                  })
                  .catch(() => {
                    toast.error("Failed to copy code");
                  });
              }}
              className="gap-2"
            >
              <Copy size={16} /> Copy Code
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
