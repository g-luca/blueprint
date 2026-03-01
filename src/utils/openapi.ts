import type { AppNode } from '../types/nodes';
import type { AppEdge } from '../types/edges';
import type { ApiProtocol, HttpMethod, ApiResponse, ApiField, SecurityScheme } from '../types/nodes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert ApiField[] into a JSON Schema object with properties and required. */
function fieldsToSchema(fields: ApiField[]): Record<string, unknown> {
  if (fields.length === 0) return {};
  const properties: Record<string, { type: string }> = {};
  const required: string[] = [];
  for (const f of fields) {
    if (!f.name.trim()) continue;
    properties[f.name.trim()] = { type: f.type };
    if (f.required) required.push(f.name.trim());
  }
  if (Object.keys(properties).length === 0) return {};
  const schema: Record<string, unknown> = { type: 'object', properties };
  if (required.length > 0) schema.required = required;
  return schema;
}

function methodForProtocol(protocol: ApiProtocol, method?: HttpMethod): string {
  if (protocol === 'REST' && method) return method.toLowerCase();
  return 'post';
}

/** Get all node IDs connected to a given node (either direction). */
function getConnectedIds(nodeId: string, edges: AppEdge[], filterType: string, nodes: AppNode[]): string[] {
  const ids: string[] = [];
  for (const edge of edges) {
    if (edge.source === nodeId) {
      const tgt = nodes.find((n) => n.id === edge.target);
      if (tgt?.type === filterType) ids.push(tgt.id);
    } else if (edge.target === nodeId) {
      const src = nodes.find((n) => n.id === edge.source);
      if (src?.type === filterType) ids.push(src.id);
    }
  }
  return ids;
}

/** Convert a SecurityScheme to OpenAPI security scheme object. */
function schemeToOpenApi(scheme: SecurityScheme): Record<string, unknown> {
  switch (scheme.type) {
    case 'bearer':
      return { type: 'http', scheme: 'bearer' };
    case 'basic':
      return { type: 'http', scheme: 'basic' };
    case 'apiKey':
      return {
        type: 'apiKey',
        name: scheme.apiKeyName || 'X-API-Key',
        in: scheme.apiKeyIn || 'header',
      };
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

export interface OpenApiSpec {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: { url: string }[];
  paths: Record<string, Record<string, unknown>>;
  tags?: { name: string; description?: string }[];
  components?: { securitySchemes?: Record<string, unknown> };
}

export function generateOpenApiSpec(nodes: AppNode[], edges: AppEdge[]): OpenApiSpec {
  // Find the root apispecification node
  const specNodes = nodes.filter((n) => n.type === 'apispecification');
  const primary = specNodes[0];

  const title       = (primary?.data.label as string)       || 'Untitled API';
  const version     = (primary?.data.apiVersion as string)   || '1.0.0';
  const description = (primary?.data.description as string)  || '';
  const serverUrl   = (primary?.data.serverUrl as string)    || '';
  const securitySchemes = (primary?.data.securitySchemes as SecurityScheme[] | undefined) ?? [];

  // Find all apiservice nodes
  const apiServiceNodes = nodes.filter((n) => n.type === 'apiservice');
  const apiServiceMap = new Map(apiServiceNodes.map((n) => [n.id, n]));

  // Build endpoint → apiservice mapping
  const endpointToApiServices = new Map<string, string[]>();
  for (const svc of apiServiceNodes) {
    const endpointIds = getConnectedIds(svc.id, edges, 'endpoint', nodes);
    for (const epId of endpointIds) {
      const list = endpointToApiServices.get(epId) ?? [];
      list.push(svc.id);
      endpointToApiServices.set(epId, list);
    }
  }

  // Find all endpoint nodes
  const endpointNodes = nodes.filter((n) => n.type === 'endpoint');

  const paths: Record<string, Record<string, unknown>> = {};
  const usedTags = new Map<string, string | undefined>(); // tag name → description

  for (const ep of endpointNodes) {
    const d = ep.data;
    const protocol      = (d.protocol      as ApiProtocol   | undefined) ?? 'REST';
    const method        = (d.method        as HttpMethod     | undefined) ?? 'GET';
    const requestFields = (d.requestFields as ApiField[]     | undefined) ?? [];
    const responses     = (d.responses     as ApiResponse[]  | undefined) ?? [];
    const headers       = (d.headers       as ApiField[]     | undefined) ?? [];
    const security      = (d.security      as string[]       | undefined) ?? [];

    const rawPath = (d.label as string)?.trim() || '/untitled';
    const httpMethod = methodForProtocol(protocol, method);

    // Determine tags and path prefix from connected apiservice nodes
    const connectedApiServices = endpointToApiServices.get(ep.id) ?? [];
    const tags: string[] = [];
    let pathPrefix = '';

    for (const svcId of connectedApiServices) {
      const svc = apiServiceMap.get(svcId);
      if (!svc) continue;
      const tagName = (svc.data.label as string) || 'default';
      const tagDesc = (svc.data.description as string) || undefined;
      tags.push(tagName);
      usedTags.set(tagName, tagDesc);
      if (!pathPrefix) {
        pathPrefix = (svc.data.pathPrefix as string) || '';
      }
    }

    // Build full path: prefix + endpoint label
    const endpointPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const fullPath = pathPrefix
      ? `${pathPrefix.replace(/\/+$/, '')}${endpointPath}`
      : endpointPath;

    // Build operation
    const operation: Record<string, unknown> = {};
    if (tags.length > 0) operation.tags = tags;
    operation.summary = fullPath;
    if (protocol !== 'REST') {
      operation.description = `Protocol: ${protocol}`;
    }
    operation.operationId = `${httpMethod}_${fullPath.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Header parameters
    const validHeaders = headers.filter((h) => h.name.trim());
    if (validHeaders.length > 0) {
      const parameters: Record<string, unknown>[] = validHeaders.map((h) => ({
        name: h.name.trim(),
        in: 'header',
        required: h.required,
        schema: { type: h.type },
      }));
      operation.parameters = parameters;
    }

    // Per-operation security
    if (security.length > 0) {
      operation.security = security.map((name) => ({ [name]: [] }));
    }

    // Request body from fields
    const validReqFields = requestFields.filter((f) => f.name.trim());
    if (validReqFields.length > 0) {
      const schema = fieldsToSchema(validReqFields);
      if (Object.keys(schema).length > 0) {
        operation.requestBody = {
          content: {
            'application/json': { schema },
          },
        };
      }
    }

    // Responses
    const responsesObj: Record<string, unknown> = {};
    if (responses.length === 0) {
      responsesObj['200'] = { description: 'Successful response' };
    } else {
      for (const r of responses) {
        const respEntry: Record<string, unknown> = {
          description: r.description || `Response ${r.code}`,
        };
        const validFields = r.fields.filter((f) => f.name.trim());
        if (validFields.length > 0) {
          const schema = fieldsToSchema(validFields);
          if (Object.keys(schema).length > 0) {
            respEntry.content = {
              'application/json': { schema },
            };
          }
        }
        responsesObj[r.code] = respEntry;
      }
    }
    operation.responses = responsesObj;

    if (!paths[fullPath]) paths[fullPath] = {};
    paths[fullPath][httpMethod] = operation;
  }

  const spec: OpenApiSpec = {
    openapi: '3.1.0',
    info: {
      title,
      version,
      ...(description ? { description } : {}),
    },
    paths,
  };

  if (serverUrl) {
    spec.servers = [{ url: serverUrl }];
  }

  if (usedTags.size > 0) {
    spec.tags = [...usedTags.entries()].map(([name, desc]) => ({
      name,
      ...(desc ? { description: desc } : {}),
    }));
  }

  // components.securitySchemes from specification node
  const validSchemes = securitySchemes.filter((s) => s.name.trim());
  if (validSchemes.length > 0) {
    const schemesObj: Record<string, unknown> = {};
    for (const s of validSchemes) {
      schemesObj[s.name.trim()] = schemeToOpenApi(s);
    }
    spec.components = { securitySchemes: schemesObj };
  }

  return spec;
}
