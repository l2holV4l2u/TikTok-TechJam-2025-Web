"use client";

import { DependencyGraph } from "../../components/graph";

export default function Dump() {
  return (
    <div className="w-full h-screen">
      <DependencyGraph
        nodes={[
          { id: "A", label: "Core Module" },
          { id: "B", label: "Auth Service" },
          { id: "C", label: "User API" },
          { id: "D", label: "Frontend" },
        ]}
        edges={[
          { source: "A", target: "B" },
          { source: "A", target: "C" },
          { source: "B", target: "D" },
          { source: "C", target: "D" },
        ]}
      />
    </div>
  );
}
