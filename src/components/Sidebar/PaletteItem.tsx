import { User, Globe, Wifi, Network, Shield, Server, Radio, Box, Type, Square, Circle, Triangle } from 'lucide-react';
import { CloudflareIcon, DatabaseIcon, RedisIcon, StorageIcon, KafkaIcon } from '../../icons';
import type { PaletteItem as PaletteItemType } from '../../types/palette';
import type { NodeType } from '../../types/nodes';

const ICONS: Record<NodeType, React.ReactNode> = {
  text:         <Type size={16} />,
  rectangle:    <Square size={16} />,
  circle:       <Circle size={16} />,
  triangle:     <Triangle size={16} />,
  client:       <User size={16} />,
  dns:          <Globe size={16} />,
  cloudflare:   <CloudflareIcon size={16} />,
  cdn:          <Wifi size={16} />,
  loadbalancer: <Network size={16} />,
  firewall:     <Shield size={16} />,
  service:      <Server size={16} />,
  apigateway:   <Radio size={16} />,
  container:    <Box size={16} />,
  database:     <DatabaseIcon size={16} />,
  cache:        <RedisIcon size={16} />,
  storage:      <StorageIcon size={16} />,
  messagequeue: <KafkaIcon size={16} />,
};

interface Props {
  item: PaletteItemType;
}

export function PaletteItem({ item }: Props) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/blueprint-node', item.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        borderRadius: '6px',
        cursor: 'grab',
        userSelect: 'none',
        color: 'var(--color-node-text)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'var(--color-sidebar-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      <span style={{ opacity: 0.85 }}>{ICONS[item.type]}</span>
      <span style={{ fontSize: '12px', fontWeight: 500 }}>{item.label}</span>
    </div>
  );
}
