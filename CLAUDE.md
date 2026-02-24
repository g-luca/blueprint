# Blueprint — System Design Canvas

An Excalidraw-like drag-and-drop canvas for drawing software architecture diagrams, built with ReactFlow.

## Stack

| Tool | Version |
|---|---|
| Vite | 6 + `@vitejs/plugin-react` + `@tailwindcss/vite` |
| React | 19 + TypeScript (strict) |
| Canvas engine | `@xyflow/react` v12 |
| State | Zustand v5 |
| Icons | `lucide-react` + `react-icons` + custom inline SVGs in `src/icons/` |
| PNG export | `html-to-image` |
| IDs | `nanoid` |
| CSS | Tailwind v4 — uses `@import "tailwindcss"` (no config file) |

## @xyflow/react v12 Patterns

**Always use named imports** — there is no default export:
```ts
import { ReactFlow, Background, Handle, NodeResizer, useReactFlow, useStore, ... } from '@xyflow/react';
```

`NodeProps<T>` and `EdgeProps<T>` require the **full** Node/Edge type:
```ts
// Correct:
NodeProps<AppNode>           // AppNode = Node<BaseNodeData, NodeType>
EdgeProps<AppEdge>           // AppEdge = Edge<FlowEdgeData, 'flow' | 'labeled'>
```

`nodeTypes` and `edgeTypes` need `as NodeTypes` / `as EdgeTypes` cast.

`useReactFlow()` and `useStore()` are available anywhere inside `<ReactFlowProvider>` (mounted at root in `main.tsx`).

## Node Types (18)

### Shape Primitives
| Type | Notes |
|---|---|
| `text` | Free-text annotation — `multilineLabel` enabled, Enter inserts newlines |
| `rectangle` | Plain rectangle, no icon |
| `circle` | `borderRadius: 50%` |
| `triangle` | `clipPath` polygon |

### Infrastructure Nodes
| Type | Accent | Special behaviour |
|---|---|---|
| `browser` | sky | Client emitter (animates by default) |
| `ios` | sky | Client emitter |
| `android` | sky | Client emitter |
| `tv` | sky | Client emitter |
| `watch` | sky | Client emitter |
| `vr` | sky | Client emitter |
| `dns` | cyan | Broadcast node |
| `cloudflare` | orange | Broadcast, default RPS=3k, single-domain editor in footer |
| `subdomain` | indigo | Broadcast, record type pills (A/CNAME/AAAA) in footer, label = address |
| `cdn` | yellow | Broadcast |
| `loadbalancer` | green | Splits RPS, LB policy selector in footer (RR/Rand/LC/Hash) |
| `firewall` | red | Broadcast |
| `service` | blue | Forwarder, splits RPS |
| `apigateway` | violet | Forwarder |
| `container` | teal | Forwarder |
| `database` | indigo | Forwarder |
| `cache` | rose | Forwarder |
| `storage` | amber | Forwarder |
| `messagequeue` | purple | Forwarder |

## Key Files

| File | Purpose |
|---|---|
| `src/themes/index.ts` | All CSS token values for 3 themes |
| `src/store/useFlowStore.ts` | All node/edge state, mutations, undo/redo history |
| `src/nodes/BaseNode.tsx` | Shared shell: handles, label edit, font panel, text section, resize, footer slot |
| `src/nodes/NodePanel.tsx` | Right-side inspector panel: font, size, align, text toggle, animation, throughput |
| `src/edges/AnimatedFlowEdge.tsx` | Animated dots via SVG `<animateMotion>`, RPS-driven |
| `src/utils/graphTps.ts` | `isEmitter`, `computeEffectiveTps`, `CLIENT_TYPES`, `BROADCAST_TYPES` |
| `src/hooks/useDrop.ts` | Bridges sidebar palette to canvas drop |
| `src/data/palette.ts` | Palette categories & items |
| `src/utils/nodeDefaults.ts` | `NODE_DIMENSIONS`, `NODE_DEFAULT_LABELS`, `NODE_DEFAULT_DATA` per type |
| `src/components/Canvas/Canvas.tsx` | ReactFlow wrapper, right-click drag selection, undo snapshot on drag |

## Adding a New Node Type

1. Add the type key to the union in `src/types/nodes.ts`
2. Add `width`/`height` (multiples of 20) to `NODE_DIMENSIONS` in `src/utils/nodeDefaults.ts`
3. Add default label to `NODE_DEFAULT_LABELS` in `src/utils/nodeDefaults.ts`
4. Optionally add per-type data overrides to `NODE_DEFAULT_DATA` (applied on drop)
5. Create `src/nodes/YourNode.tsx` using `BaseNode` with optional `icon`, `accentColor`, `bodyStyle`, `footer`, `labelPlaceholder`, `multilineLabel`
6. Register in `src/nodes/index.ts`
7. Add icon to `ICONS` record in `src/components/Sidebar/PaletteItem.tsx`
8. Add item to a category in `src/data/palette.ts`
9. If it's a broadcast type, add to `BROADCAST_TYPES` in `src/utils/graphTps.ts`

## Theme System

3 themes: `blueprint` (default) | `dark` | `light`

- CSS vars injected on `<html>` via `useEffect` in `App.tsx` on every theme change
- All var names: `--color-*` (e.g. `--color-canvas-bg`, `--color-node-bg`, `--color-node-border`)
- Source of truth: `src/themes/index.ts`
- Blueprint: cobalt blue canvas, white node outlines, sky-300 animated dots
- In Blueprint theme, node accent colors collapse to `rgba(255,255,255,0.9)` (handled in `BaseNode`)
- Persisted to `localStorage` key `"blueprint-theme"`

## State (Zustand — useFlowStore)

```ts
nodes, edges
past, future                           // undo/redo stacks (max 50)
onNodesChange, onEdgesChange, onConnect
addNode(node)
updateNodeLabel(id, label)
updateNodeData(id, patch)
updateEdgeData(id, patch)
removeSelectedElements()
selectAll(), copySelected(), pasteClipboard()
saveSnapshot()                         // call BEFORE any undoable mutation
undo(), redo()
saveToStorage(), loadFromStorage(), clearCanvas()
```

localStorage key: `"blueprint-canvas-v1"`

Every mutating action calls `saveSnapshot()` before applying changes. `Canvas.tsx` also calls `saveSnapshot` via `onNodeDragStart`.

## Animation & TPS System (`src/utils/graphTps.ts`)

- `CLIENT_TYPES`: `browser | ios | android | tv | watch | vr` — emit by default
- `BROADCAST_TYPES`: `cloudflare | cdn | dns | subdomain | firewall` — forward full RPS to **every** outgoing edge (no split)
- All other nodes split TPS equally across outgoing edges (load-balancer semantics)
- `isEmitter(node)`: true if `data.animated === true`, false if `data.animated === false`, else checks `CLIENT_TYPES`
- `computeEffectiveTps(nodes, edges)`: Kahn's topological sort; emitters use own `data.tps` (default 1k); forwarders sum upstream. Emitter targets are excluded from outTargets (emitter-to-emitter edges don't propagate TPS).
- Edge dot timing: `edgeTps = isBroadcast ? sourceTps : sourceTps / numOutgoing`; phase stagger via `staggerSlot()` for LB policies
- LB policies: `round-robin` (sequential stagger) | `random` (hash by edge ID) | `least-conn` (first half gets slot 0) | `ip-hash` (hash by target)

## BaseNode Props

```ts
interface BaseNodeProps extends NodeProps<AppNode> {
  icon?: React.ReactNode;
  accentColor?: string;
  bodyStyle?: React.CSSProperties;   // shape overrides (borderRadius, clipPath)
  footer?: React.ReactNode;          // rendered below label/text (LB policy bar, domain editor, etc.)
  labelPlaceholder?: string;         // shown dimmed when label is empty
  multilineLabel?: boolean;          // textarea instead of input; Enter = newline, Escape = commit
}
```

## Canvas Interaction

- **Left-click + drag**: pan canvas (`panOnDrag={true}`)
- **Right-click + drag**: custom marquee selection — draws a `position:fixed` rect, on mouseup uses `getIntersectingNodes` to select nodes. Cursor forced to `crosshair` via injected `<style>` tag overriding ReactFlow's `.react-flow__pane` cursor.
- **Click node**: select
- **Delete / Backspace**: delete selected
- **Cmd+Z**: undo | **Cmd+Y / Cmd+Shift+Z**: redo
- **Cmd+A**: select all | **Cmd+C/V**: copy/paste | **Cmd+S**: save | **Cmd+O**: load

## Toolbar Menus

- **File**: Save, Load, Export PNG, Clear Canvas
- **Edit**: Undo (⌘Z), Redo (⌘Y) — grayed out when stack is empty
- **Window**: Theme selector (Blueprint/Dark/Light), Show Grid toggle

## Important Notes

- `deleteKeyCode={null}` on ReactFlow — deletion handled by `useKeyboardShortcuts`
- Grid snap: `snapToGrid={true}`, `snapGrid={[20, 20]}` — all node dimensions must be multiples of 20
- `NODE_DEFAULT_DATA` in `nodeDefaults.ts` applies per-type data on drop (e.g. `cloudflare: { tps: 3 }`)
- **Never use NodeToolbar** — portal causes deselection before onClick fires; use `position:absolute` div with `onMouseDown={stopPropagation}`
- NodePanel is shown as a fixed `position:absolute` overlay in Canvas (not inside ReactFlow's node tree)
- Right-click drag selection: crosshair cursor injected via `<style>` tag (not inline style — ReactFlow's `.react-flow__pane` has explicit cursor that overrides inherited styles)
- Scaffold manually if `npm create vite` fails (`.claude` directory causes existing-dir error)
- `react-icons` is also installed (used for `SiCloudflare`, `MdHub`, etc.) alongside `lucide-react`
