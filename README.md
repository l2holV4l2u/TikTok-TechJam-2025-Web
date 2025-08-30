# Tokbokki – Kotlin Dependency Visualization Tool

**AI-powered Kotlin dependency visualizer and optimizer.**  
**Tagline:** Turn tangled code into clean, confident architecture.

---

## 1) Problem Statement
Large Kotlin codebases using DI (e.g., TikTok’s Knit) accumulate circular/unused dependencies that slow builds and make refactors risky. Teams lack a clear, interactive view of class-level relationships and DI flows.

---

## 2) What This Project Does (Features & Functionality)
- **GitHub Integration (stub-ready):** Sign in with GitHub OAuth, list repos, and select a repo (API shell provided).  
- **Repository Exploration (stub-ready):** Browse Kotlin files in a tree; preview code (API shell provided).  
- **Static Graph Input:** Paste or upload analyzed JSON (.kt parser not required to run the demo).  
- **Interactive Visualization:** Uses React Flow with auto-layout (Dagre) to render classes and DI edges.  
- **Insights:**
  - Detects circular dependencies and highlights them.  
  - Flags unused providers (e.g., `@Provides` with no consumers).  
  - Quick filters & search (by class name, DI kind).  
- **AI (stub-ready):** Hook for GPT to generate suggestions (refactors, dead code hints).  

⚡️ This repo focuses on the visualization tool. It accepts a JSON graph (output of your analysis pipeline) and renders graphs + insights in real time.

---

## 3) Development Tools
- **Framework:** Next.js 15 (App Router), React 19, TypeScript  
- **Build/Dev:** Node ≥ 18, pnpm/yarn/npm, Vite-powered Next toolchain  
- **Styling:** Tailwind CSS  
- **Graph:** React Flow + Dagre (auto-layout)  
- **Lint/Format:** ESLint + Prettier (optional)  

---

## 4) APIs Used
- **GitHub REST API (stub-ready):** List repositories, fetch file trees/contents.  
- **OpenAI API (stub-ready):** Summarize issues, propose refactors.  

*Notes:* API routes are provided as stubs. You can plug credentials to enable live GitHub/OpenAI when ready.

---

## 5) Assets
- **Logo/Brand:** simple text/emoji (🍲 Tokbokki).  
- **Icons:** Lucide (optional).  
- **Graph UI:** React Flow built-in handles & controls.  

---

## 6) Libraries
- `react`, `react-dom`, `next`  
- `reactflow` (graph rendering)  
- `dagre` (graph auto-layout)  
- `tailwindcss`, `postcss`, `autoprefixer`  
- *(optional)* `lucide-react`, `zod`  

---

## 7) Quickstart
```bash
# 1) Create app
npx create-next-app@latest tokbokki-viz --ts --app --eslint --tailwind
cd tokbokki-viz

# 2) Install libs
pnpm add reactflow dagre
# or: npm i reactflow dagre

# 3) Replace/add the files below, then run
pnpm dev
# open http://localhost:3000
```
## 8) How to Use the Tool (Demo Flow)

1. **Start the dev server** and open the app.  
2. **Load data**:  
   - Click **“Load Sample”** to see a working Knit-style graph, or  
   - Upload JSON that matches the schema (see below).  
3. **Explore the graph**:  
   - Pan/zoom, click nodes/edges for details in the sidebar.  
   - Use **Search** to filter by class name.  
   - Toggle **Highlight Cycles** to visualize circular dependencies.  
   - Toggle **Show Unused Providers** to focus on potential dead code.  
4. **Export**:  
   - Copy filtered node IDs or JSON from the sidebar.  
   - Integrate results with your CI checks (extend as needed).  

---

## 9) JSON Graph Schema (Input)

```ts
// lib/types.ts
export type TokNode = {
  id: string;                // class or object name
  kind?: 'class' | 'interface' | 'object' | 'module';
  file?: string;             // relative source path
  annotations?: string[];    // e.g. ["@Provides", "@Inject"]
  provides?: string[];       // tokens provided (for DI)
  injectedProps?: string[];  // injected properties or constructor params
};

export type TokEdge = {
  id: string;                // `${source}->${target}`
  source: string;            // class A
  target: string;            // depends on class B
  type?: 'injects' | 'provides' | 'uses';
  label?: string;            // optional edge label
};

export type TokGraph = {
  nodes: TokNode[];
  edges: TokEdge[];
};
```
## 10) Sample Data (Knit‑style)
```json
{
  "nodes": [
    {"id": "NetworkModule", "kind": "object", "annotations": ["@Module"], "provides": ["HttpClient"]},
    {"id": "HttpClient", "kind": "class", "annotations": ["@Provides"], "file": "di/NetworkModule.kt"},
    {"id": "UserRepository", "kind": "class", "injectedProps": ["HttpClient"], "file": "data/UserRepository.kt"},
    {"id": "UserService", "kind": "class", "injectedProps": ["UserRepository"], "file": "domain/UserService.kt"},
    {"id": "UserViewModel", "kind": "class", "injectedProps": ["UserService"], "file": "ui/UserViewModel.kt"},
    {"id": "Analytics", "kind": "class", "annotations": ["@Provides"], "file": "di/Analytics.kt"},
    {"id": "Telemetry", "kind": "class", "injectedProps": ["Analytics"], "file": "infra/Telemetry.kt"},
    {"id": "CycleA", "kind": "class", "injectedProps": ["CycleB"], "file": "weird/CycleA.kt"},
    {"id": "CycleB", "kind": "class", "injectedProps": ["CycleA"], "file": "weird/CycleB.kt"}
  ],
  "edges": [
    {"id": "NetworkModule->HttpClient", "source": "NetworkModule", "target": "HttpClient", "type": "provides"},
    {"id": "HttpClient->UserRepository", "source": "HttpClient", "target": "UserRepository", "type": "uses"},
    {"id": "UserRepository->UserService", "source": "UserRepository", "target": "UserService", "type": "injects"},
    {"id": "UserService->UserViewModel", "source": "UserService", "target": "UserViewModel", "type": "injects"},
    {"id": "Analytics->Telemetry", "source": "Analytics", "target": "Telemetry", "type": "provides"},
    {"id": "CycleA->CycleB", "source": "CycleA", "target": "CycleB", "type": "injects"},
    {"id": "CycleB->CycleA", "source": "CycleB", "target": "CycleA", "type": "injects"}
  ]
}
```

