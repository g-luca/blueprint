import { type NodeProps } from '@xyflow/react';
import { Braces } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { AppNode, BaseNodeData, HttpMethod, ApiProtocol, ApiResponse } from '../types/nodes';

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET:    '#22c55e',
  POST:   '#3b82f6',
  PUT:    '#f59e0b',
  PATCH:  '#a78bfa',
  DELETE: '#ef4444',
};

function responseColor(code: string): string {
  if (code.startsWith('2')) return '#22c55e';
  if (code.startsWith('3')) return '#3b82f6';
  if (code.startsWith('4')) return '#f59e0b';
  if (code.startsWith('5')) return '#ef4444';
  return '#9ca3af';
}

function EndpointFooter({ data }: { data: BaseNodeData }) {
  const protocol  = (data.protocol  as ApiProtocol  | undefined) ?? 'REST';
  const method    = (data.method    as HttpMethod    | undefined);
  const requests  = (data.requests  as string[]      | undefined) ?? [];
  const responses = (data.responses as ApiResponse[] | undefined) ?? [];

  const visibleRequests = requests.filter(Boolean).slice(0, 3);
  const extraRequests = Math.max(0, requests.filter(Boolean).length - 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Row 1: method + protocol badge */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        {protocol === 'REST' && method && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
            background: METHOD_COLORS[method], color: '#fff', letterSpacing: '0.04em',
          }}>
            {method}
          </span>
        )}
        <span style={{
          fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3,
          background: 'rgba(128,128,128,0.18)', color: 'var(--color-node-text)',
          letterSpacing: '0.03em', opacity: 0.8,
        }}>
          {protocol}
        </span>
      </div>

      {/* Row 2: request fields */}
      {visibleRequests.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {visibleRequests.map((r, i) => (
            <div key={i} style={{ fontSize: 9, opacity: 0.6, letterSpacing: '0.02em' }}>
              → {r}
            </div>
          ))}
          {extraRequests > 0 && (
            <div style={{ fontSize: 9, opacity: 0.4 }}>+{extraRequests} more</div>
          )}
        </div>
      )}

      {/* Row 3: response code pills */}
      {responses.length > 0 && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {responses.map((r) => (
            <span key={r.code} style={{
              fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
              background: responseColor(r.code), color: '#fff',
            }}>
              {r.code}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function EndpointNode(props: NodeProps<AppNode>) {
  return (
    <BaseNode
      {...props}
      icon={<Braces size={14} />}
      accentColor="#fb923c"
      labelPlaceholder="/path or MethodName"
      footer={<EndpointFooter data={props.data} />}
    />
  );
}
