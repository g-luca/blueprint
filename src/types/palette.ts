import type { NodeType } from './nodes';

export interface PaletteItem {
  type: NodeType;
  label: string;
  description?: string;
}

export interface PaletteCategory {
  id: string;
  label: string;
  items: PaletteItem[];
}
