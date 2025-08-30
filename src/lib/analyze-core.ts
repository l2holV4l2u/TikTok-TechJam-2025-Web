// src/lib/analyze-core.ts
import "server-only";

// type-only (erased at build)
import type ParserNS from "tree-sitter";

// ---- Result Types ----
export interface NodeMeta {
  id: string;
  kind: "class";
  definedIn: { file: string; line: number };
  usedIn: { file: string; line: number }[];
}
export interface Edge {
  source: string;
  target: string;
  kind: "provider-param" | "consumer-requests";
  sourceLocation: { file: string; line: number };
}
export interface AnalysisResult {
  nodes: NodeMeta[];
  edges: Edge[];
  fileToDefinedNodes: Record<string, string[]>;
}
export type InMemoryFile = { path: string; content: string };

const DEDUPE_BY_MEANING = true;

// --- lazy loader for native modules ---
let parserModP: Promise<any> | null = null;
let kotlinModP: Promise<any> | null = null;

async function createParser(): Promise<ParserNS> {
  if (!parserModP) parserModP = import("tree-sitter");
  if (!kotlinModP) kotlinModP = import("tree-sitter-kotlin");
  const [{ default: Parser }, Kotlin] = await Promise.all([
    parserModP,
    kotlinModP,
  ]);
  const KotlinLang = (Kotlin as any).default ?? (Kotlin as any);
  const p = new Parser();
  p.setLanguage(KotlinLang);
  return p as unknown as ParserNS;
}

// ---- minimal node shape (so we don’t import types at top-level) ----
type SyntaxNode = {
  type: string;
  startIndex: number;
  endIndex: number;
  startPosition: { row: number; column: number };
  parent: SyntaxNode | null;
  namedChildCount: number;
  namedChild(i: number): SyntaxNode | null;
};

function walk(node: SyntaxNode, fn: (n: SyntaxNode) => void) {
  fn(node);
  for (let i = 0; i < node.namedChildCount; i++) walk(node.namedChild(i)!, fn);
}
function firstChildOfType(n: SyntaxNode, t: string) {
  for (let i = 0; i < n.namedChildCount; i++) {
    const c = n.namedChild(i)!;
    if (c.type === t) return c;
  }
  return null;
}
function ancestorOfType(node: SyntaxNode, types: string[]): SyntaxNode | null {
  let cur: SyntaxNode | null = node.parent;
  while (cur) {
    if (types.includes(cur.type)) return cur;
    cur = cur.parent;
  }
  return null;
}
function simpleIdentifierFrom(node: SyntaxNode, code: string): string | null {
  const id =
    firstChildOfType(node, "simple_identifier") ||
    firstChildOfType(node, "type_identifier");
  return id ? code.slice(id.startIndex, id.endIndex) : null;
}

// ---- Kotlin helpers ----
function getPackageName(code: string): string {
  const m = code.match(/\bpackage\s+([A-Za-z0-9_.]+)/);
  return m ? m[1] : "";
}
function collectImports(code: string): Record<string, string> {
  const map: Record<string, string> = {};
  const re = /^\s*import\s+([A-Za-z0-9_.]+)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const fqn = m[1];
    const short = fqn.split(".").pop()!;
    map[short] = fqn;
  }
  return map;
}
function qualify(
  raw: string,
  pkg: string,
  imports: Record<string, string>
): string {
  let base = raw.replace(/\s+/g, "");
  base = base.replace(/<[^<>]*>/g, "");
  base = base.replace(/\?+$/, "");
  if (base.includes(".")) return base;
  return imports[base] || (pkg ? `${pkg}.${base}` : base);
}
function hasProvidesAnnotation(node: SyntaxNode, code: string): boolean {
  const mods = firstChildOfType(node, "modifiers");
  if (mods) {
    for (let i = 0; i < mods.namedChildCount; i++) {
      const c = mods.namedChild(i)!;
      if (
        c.type === "annotation" &&
        code.slice(c.startIndex, c.endIndex).includes("@Provides")
      )
        return true;
    }
  }
  const head = code.slice(Math.max(0, node.startIndex - 160), node.startIndex);
  return /@Provides\b/.test(head);
}
function providesTargetFromAnnotationText(txt: string): string | null {
  // No /s flag needed
  const m = txt.match(
    /@Provides\s*\(\s*(?:\w+\s*=\s*)?([\w.]+)\s*::\s*class\s*\)/
  );
  return m ? m[1] : null;
}
function returnTypeFromProvidesFunction(text: string): string | null {
  const m = text.match(
    /:\s*(?:@[A-Za-z0-9_.]+(?:\([^)]*\))?\s*)*([A-Za-z0-9_.<>?]+)/
  );
  return m ? m[1] : null;
}
function classHeaderParamTypes(classText: string): string[] {
  const header = classText.match(/\bclass\b[\s\S]*?\(([\s\S]*?)\)/);
  if (!header) return [];
  const inside = header[1];
  const out: string[] = [];
  const re = /:\s*([A-Za-z0-9_.<>?]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inside))) out.push(m[1]);
  return out;
}
function unwrapKnownWrappers(t: string): string {
  const m = t.match(/^([A-Za-z0-9_.]+)\s*<\s*([^>]+)\s*>$/);
  if (!m) return t;
  const outer = m[1];
  const inner = m[2];
  const KNOWN = new Set(["Loadable", "knit.Loadable"]);
  const short = outer.split(".").pop()!;
  return KNOWN.has(outer) || KNOWN.has(short) ? inner : t;
}

// ---- analyze in-memory .kt files ----
export async function analyzeFiles(
  files: InMemoryFile[]
): Promise<AnalysisResult> {
  const parser = await createParser();

  const nodesMap: Record<string, NodeMeta> = {};
  const fileToDefinedNodesSet: Record<string, Set<string>> = {};
  const rawEdges: Edge[] = [];

  const addDefinedNode = (id: string, file: string, line: number) => {
    if (!nodesMap[id])
      nodesMap[id] = {
        id,
        kind: "class",
        definedIn: { file, line },
        usedIn: [],
      };
    (fileToDefinedNodesSet[file] ||= new Set()).add(id);
  };
  const addRawEdge = (
    source: string,
    target: string,
    kind: Edge["kind"],
    file: string,
    line: number
  ) => {
    rawEdges.push({ source, target, kind, sourceLocation: { file, line } });
  };

  for (const f of files) {
    const rel = f.path.replace(/\\/g, "/");
    const code = f.content;
    const pkg = getPackageName(code);
    const imports = collectImports(code);
    const tree = (parser as any).parse(code) as { rootNode: SyntaxNode };

    // (1) definitions
    walk(tree.rootNode, (n) => {
      if (
        n.type === "class_declaration" ||
        n.type === "interface_declaration"
      ) {
        const name = simpleIdentifierFrom(n, code);
        if (name)
          addDefinedNode(
            qualify(name, pkg, imports),
            rel,
            n.startPosition.row + 1
          );
      }
      if (n.type === "object_declaration") {
        const startIndex = (n as any).startIndex;
        const head = code.slice(startIndex, startIndex + 60);
        if (/^\s*companion\s+object\b/.test(head)) return;
        const name = simpleIdentifierFrom(n, code);
        if (name)
          addDefinedNode(
            qualify(name, pkg, imports),
            rel,
            n.startPosition.row + 1
          );
      }
    });

    // (2) providers
    walk(tree.rootNode, (n) => {
      if (n.type === "class_declaration" && hasProvidesAnnotation(n, code)) {
        const className = simpleIdentifierFrom(n, code);
        if (className) {
          const classFqn = qualify(className, pkg, imports);
          const start = (n as any).startIndex;
          const end = (n as any).endIndex;
          const classText = code.slice(start, end);
          const annWindow =
            code.slice(Math.max(0, start - 200), start) +
            classText.slice(0, 200);
          const target = providesTargetFromAnnotationText(annWindow);
          if (target) {
            const provided = qualify(target, pkg, imports);
            addRawEdge(
              provided,
              classFqn,
              "provider-param",
              rel,
              n.startPosition.row + 1
            );
          } else {
            for (const t of classHeaderParamTypes(classText)) {
              const dep = qualify(t, pkg, imports);
              addRawEdge(
                classFqn,
                dep,
                "provider-param",
                rel,
                n.startPosition.row + 1
              );
            }
          }
        }
      }

      if (n.type === "constructor" && hasProvidesAnnotation(n, code)) {
        const owner = ancestorOfType(n, ["class_declaration"]);
        const ownerName = owner ? simpleIdentifierFrom(owner, code) : null;
        if (ownerName) {
          const ownerFqn = qualify(ownerName, pkg, imports);
          for (let i = 0; i < (n as any).namedChildCount; i++) {
            const p = (n as any).namedChild(i) as SyntaxNode | null;
            if (!p || p.type !== "parameter") continue;
            const t = firstChildOfType(p, "type");
            if (t) {
              const dep = qualify(
                code.slice((t as any).startIndex, (t as any).endIndex),
                pkg,
                imports
              );
              addRawEdge(
                ownerFqn,
                dep,
                "provider-param",
                rel,
                t.startPosition.row + 1
              );
            }
          }
        }
      }

      if (n.type === "function_declaration" && hasProvidesAnnotation(n, code)) {
        const text = code.slice((n as any).startIndex, (n as any).endIndex);
        const ret = returnTypeFromProvidesFunction(text);
        if (ret) {
          const provided = qualify(ret, pkg, imports);
          const paramsMatch = text.match(/\(([\s\S]*?)\)/);
          if (paramsMatch) {
            const params = paramsMatch[1];
            const re = /:\s*([A-Za-z0-9_.<>?]+)/g;
            let m: RegExpExecArray | null;
            while ((m = re.exec(params))) {
              const dep = qualify(m[1], pkg, imports);
              addRawEdge(
                provided,
                dep,
                "provider-param",
                rel,
                (n as any).startPosition.row + 1
              );
            }
          }
        }
      }

      if (n.type === "property_declaration") {
        const start = (n as any).startIndex;
        const end = (n as any).endIndex;
        const text = code.slice(start, end);
        const annWindow =
          code.slice(Math.max(0, start - 200), start) + text.slice(0, 200);
        const hasAnn =
          hasProvidesAnnotation(n, code) || /@Provides\s*\(/.test(annWindow);
        if (hasAnn) {
          const target = providesTargetFromAnnotationText(annWindow);
          if (target) {
            const provided = qualify(target, pkg, imports);
            const m = text.match(/:\s*([A-Za-z0-9_.<>?]+)/);
            if (m) {
              const impl = qualify(m[1], pkg, imports);
              addRawEdge(
                provided,
                impl,
                "provider-param",
                rel,
                (n as any).startPosition.row + 1
              );
            }
          }
        }
      }
    });

    // (3) consumers: val/var ... : T by di
    walk(tree.rootNode, (n) => {
      if (n.type !== "property_declaration") return;
      const text = code.slice((n as any).startIndex, (n as any).endIndex);
      if (!/\bby\s+di\b/.test(text)) return;

      const m = text.match(
        /\b(val|var)\s+\w+\s*:\s*([A-Za-z0-9_.<>?]+)\s+by\s+di\b/
      );
      const rawType = m ? m[2] : null;
      if (!rawType) return;

      const unwrapped = unwrapKnownWrappers(rawType);
      const req = qualify(unwrapped, pkg, imports);

      let ownerNode = ancestorOfType(n, [
        "class_declaration",
        "object_declaration",
        "interface_declaration",
        "companion_object",
      ]);
      if (ownerNode && ownerNode.type === "companion_object") {
        ownerNode = ancestorOfType(ownerNode, [
          "class_declaration",
          "object_declaration",
          "interface_declaration",
        ]);
      }
      const ownerName = ownerNode
        ? simpleIdentifierFrom(ownerNode, code)
        : null;
      const ownerFqn = ownerName
        ? qualify(ownerName, pkg, imports)
        : "UnknownOwner";

      addRawEdge(
        ownerFqn,
        req,
        "consumer-requests",
        rel,
        (n as any).startPosition.row + 1
      );
    });
  }

  // keep only internal->internal edges; dedupe
  const nodeIds = new Set(Object.keys(nodesMap));
  const edges: Edge[] = [];
  const seen = new Set<string>();
  for (const e of rawEdges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    const key = DEDUPE_BY_MEANING
      ? `${e.source}|${e.target}|${e.kind}`
      : `${e.source}|${e.target}|${e.kind}|${e.sourceLocation.file}|${e.sourceLocation.line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push(e);
  }

  const fileToDefinedNodes: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(fileToDefinedNodesSet)) {
    fileToDefinedNodes[k] = Array.from(v);
  }

  return { nodes: Object.values(nodesMap), edges, fileToDefinedNodes };
}
