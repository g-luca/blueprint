# Blueprint — System Design Canvas

An Excalidraw-like drag-and-drop canvas for drawing software architecture diagrams, built with ReactFlow.

## Stack

| Tool | Version |
|---|---|
| Vite | 6 + `@vitejs/plugin-react` + `@tailwindcss/vite` |
| React | 19 + TypeScript (strict) |
| Canvas engine | `@xyflow/react` v12 |
| State | Zustand v5 |
| Icons | `lucide-react` + custom inline SVGs in `src/icons/` |
| PNG export | `html-to-image` |
| IDs | `nanoid` |
| CSS | Tailwind v4 — uses `@import "tailwindcss"` (no config file) |

## @xyflow/react v12 Patterns

**Always use named imports** — there is no default export:
```ts
import { ReactFlow, Background, Handle, NodeResizer, ... } from '@xyflow/react';
```

`NodeProps<T>` and `EdgeProps<T>` require the **full** Node/Edge type:
```ts
// Correct:
NodeProps<AppNode>           // AppNode = Node<BaseNodeData, NodeType>
EdgeProps<AppEdge>           // AppEdge = Edge<FlowEdgeData, 'flow' | 'labeled'>

// Wrong:
NodeProps<BaseNodeData>      // TypeScript error
```

`nodeTypes` and `edgeTypes` need `as NodeTypes` / `as EdgeTypes` cast:
```ts
export const nodeTypes = { service: ServiceNode, ... } as NodeTypes;
```

## Node Types (17)

### Shape Primitives (top of palette)
| Type | Description |
|---|---|
| `text` | Free-text annotation (transparent, dashed border) |
| `rectangle` | Plain rectangle (no icon, sharp corners) |
| `circle` | Circle shape (no icon, `borderRadius: 50%`) |
| `triangle` | Triangle shape (no icon, `clipPath` polygon) |

### Infrastructure Nodes
`client`, `dns`, `cloudflare`, `cdn`, `loadbalancer`, `firewall`, `service`, `apigateway`, `container`, `database`, `cache`, `storage`, `messagequeue`

## Key Files

| File | Purpose |
|---|---|
| `src/themes/index.ts` | All CSS token values for 3 themes |
| `src/store/useFlowStore.ts` | All node/edge state & mutations |
| `src/nodes/BaseNode.tsx` | Shared shell for all nodes — handles, label edit, font toolbar, text section, resize |
| `src/edges/AnimatedFlowEdge.tsx` | Animated dots via SVG `<animateMotion>` |
| `src/hooks/useDrop.ts` | Bridges sidebar palette to canvas drop |
| `src/data/palette.ts` | Palette categories & items — add new component type here first |
| `src/utils/nodeDefaults.ts` | Default width/height/label per node type (all must be multiples of 20) |

## Adding a New Node Type

1. Add the type key to the union in `src/types/nodes.ts`
2. Add `width`/`height` (multiples of 20) to `NODE_DIMENSIONS` in `src/utils/nodeDefaults.ts`
3. Add default label to `NODE_DEFAULT_LABELS` in `src/utils/nodeDefaults.ts`
4. Create `src/nodes/YourNode.tsx` using `BaseNode` with optional `icon`, `accentColor`, `bodyStyle`
5. Register in `src/nodes/index.ts`
6. Add icon to `ICONS` record in `src/components/Sidebar/PaletteItem.tsx`
7. Add item to a category in `src/data/palette.ts`

## Theme System

3 themes: `blueprint` (default) | `dark` | `light`

- CSS vars are injected on `<html>` via `useEffect` in `App.tsx` on every theme change
- All var names: `--color-*` (e.g. `--color-canvas-bg`, `--color-node-bg`, `--color-node-border`)
- Source of truth: `src/themes/index.ts` — the `THEMES` record maps theme name → token object
- Blueprint: cobalt blue canvas, white node outlines, sky-300 animated edge dots
- In Blueprint theme, node accent colors collapse to `rgba(255,255,255,0.9)` (handled in `BaseNode`)
- Persisted to `localStorage` key `"blueprint-theme"`

## State (Zustand)

```ts
// useFlowStore — canvas state
nodes, edges
onNodesChange, onEdgesChange, onConnect
addNode(node), updateNodeLabel(id, label), updateNodeData(id, patch)
removeSelectedElements()
saveToStorage(), loadFromStorage(), clearCanvas()
```

localStorage key: `"blueprint-canvas-v1"`

## BaseNode Features

- **Resize**: `NodeResizer` (visible when selected, min 80×60)
- **Inline label edit**: double-click → input field → Enter or blur commits
- **Font toolbar**: appears above node when selected (absolutely positioned, NOT a NodeToolbar portal)
  - Font family: Sans / Serif / Mono
  - Font size: A− / A+ (stepped through `[10,11,12,13,14,16,18,20,24]`)
  - Font applies to **both** label and text body
- **Text section**: toggled by the "T" button; state persisted in Zustand (`text !== undefined` = shown)
- **4 handles**: Top (target), Bottom (source), Left (target), Right (source)
- `bodyStyle` prop: merged onto body div — used by shape nodes to set `borderRadius`, `clipPath`, etc.
- `icon` prop: omit for shape nodes (renders nothing when undefined)

## Important Notes

- `deleteKeyCode={null}` on ReactFlow — deletion handled by `useKeyboardShortcuts` (Delete/Backspace)
- Grid snap: `snapToGrid={true}`, `snapGrid={[20, 20]}` — all node default dimensions are multiples of 20
- Drop position snaps the **top-left corner** of the node to the grid (not the center)
- PNG export filters out `.react-flow__minimap`, `.react-flow__controls`, `.react-flow__attribution`
- **Never use NodeToolbar** — it's a portal and causes deselection before onClick fires; use an absolutely-positioned div instead
- Scaffold manually if `npm create vite` fails (`.claude` directory causes an existing-dir error)
