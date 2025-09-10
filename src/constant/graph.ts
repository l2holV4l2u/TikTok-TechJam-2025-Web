// Node styling constants
export const NODE_STYLES = {
  SELECTED: {
    boxShadow:
      "0 0 0 3px rgba(99, 102, 241, 0.5), 0 20px 35px -5px rgba(99, 102, 241, 0.4)",
    border: "3px solid #6366f1",
    zIndex: 10,
  },
  PARENT: {
    boxShadow:
      "0 0 0 2px rgba(34, 197, 94, 0.5), 0 15px 25px -5px rgba(34, 197, 94, 0.3)",
    border: "2px solid #22c55e",
    background: "rgba(240, 253, 244, 0.95)",
  },
  CHILD: {
    boxShadow:
      "0 0 0 2px rgba(249, 115, 22, 0.5), 0 15px 25px -5px rgba(249, 115, 22, 0.3)",
    border: "2px solid #f97316",
    background: "rgba(255, 247, 237, 0.95)",
  },
  CYCLE: {
    boxShadow:
      "0 0 0 3px rgba(239, 68, 68, 0.6), 0 15px 25px -5px rgba(239, 68, 68, 0.4)",
    border: "3px solid #ef4444",
    background: "rgba(254, 242, 242, 0.95)",
    zIndex: 10,
  },
  HEAVY: {
    boxShadow:
      "0 0 0 3px rgba(168, 85, 247, 0.6), 0 15px 25px -5px rgba(168, 85, 247, 0.4)",
    border: "3px solid #a855f7",
    background: "rgba(250, 245, 255, 0.95)",
    zIndex: 10,
  },
  LONGEST_PATH: {
    boxShadow:
      "0 0 0 3px rgba(14, 165, 233, 0.6), 0 15px 25px -5px rgba(14, 165, 233, 0.4)",
    border: "3px solid #0ea5e9",
    background: "rgba(240, 249, 255, 0.95)",
    zIndex: 10,
  },
  CRITICAL: {
    boxShadow:
      "0 0 0 3px rgba(245, 158, 11, 0.6), 0 15px 25px -5px rgba(245, 158, 11, 0.4)",
    border: "3px solid #f59e0b",
    background: "rgba(255, 251, 235, 0.95)",
    zIndex: 10,
  },
  FADED: {
    opacity: 0.15,
    filter: "grayscale(0.8)",
    transition: "all 0.3s ease-in-out",
  },
  DIMMED: {
    opacity: 0.25,
    filter: "grayscale(0.7)",
    transition: "all 0.3s ease-in-out",
  },
};

// Edge styling constants
export const EDGE_STYLES = {
  DEFAULT: {
    strokeColor: "#94a3b8",
    strokeWidth: 2,
    opacity: 1,
  },
  PARENT: {
    strokeColor: "#22c55e",
    strokeWidth: 3,
    opacity: 1,
  },
  CHILD: {
    strokeColor: "#f97316",
    strokeWidth: 3,
    opacity: 1,
  },
  CYCLE: {
    strokeColor: "#ef4444",
    strokeWidth: 4,
    opacity: 1,
    strokeDasharray: "8,4",
  },
  LONGEST_PATH: {
    strokeColor: "#0ea5e9",
    strokeWidth: 4,
    opacity: 1,
    strokeDasharray: "12,4",
  },
  FADED: {
    strokeColor: "#94a3b8",
    strokeWidth: 2,
    opacity: 0.1,
  },
  DIMMED: {
    strokeColor: "#94a3b8",
    strokeWidth: 2,
    opacity: 0.15,
  },
};

export const NODE_COLORS = [
  "from-purple-500 to-indigo-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-pink-500 to-rose-600",
  "from-violet-500 to-purple-600",
];
