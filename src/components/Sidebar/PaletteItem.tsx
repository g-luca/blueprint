import { MdPerson, MdPublic, MdWifi, MdHub, MdSecurity, MdStorage, MdRouter, MdTitle, MdSquare, MdCircle, MdChangeHistory } from 'react-icons/md';
import { SiCloudflare, SiRedis, SiAmazons3, SiApachekafka, SiDocker, SiPostgresql } from 'react-icons/si';
import type { PaletteItem as PaletteItemType } from '../../types/palette';
import type { NodeType } from '../../types/nodes';

const ICONS: Record<NodeType, React.ReactNode> = {
  text:         <MdTitle size={16} />,
  rectangle:    <MdSquare size={16} />,
  circle:       <MdCircle size={16} />,
  triangle:     <MdChangeHistory size={16} />,
  client:       <MdPerson size={16} />,
  dns:          <MdPublic size={16} />,
  cloudflare:   <SiCloudflare size={14} />,
  cdn:          <MdWifi size={16} />,
  loadbalancer: <MdHub size={16} />,
  firewall:     <MdSecurity size={16} />,
  service:      <MdStorage size={16} />,
  apigateway:   <MdRouter size={16} />,
  container:    <SiDocker size={14} />,
  database:     <SiPostgresql size={14} />,
  cache:        <SiRedis size={14} />,
  storage:      <SiAmazons3 size={14} />,
  messagequeue: <SiApachekafka size={14} />,
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
