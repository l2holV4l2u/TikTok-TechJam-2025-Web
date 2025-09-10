import { Loader2 } from "lucide-react";

export function LoadingSpinner({ size = 64, className = "" }) {
  return (
    <div
      className={`flex items-center justify-center ${className} w-screen h-screen`}
    >
      <Loader2 className="animate-spin text-purple-500" size={size} />
    </div>
  );
}
