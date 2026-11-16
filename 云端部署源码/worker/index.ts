import handler from "vinext/server/fetch-handler";
import { kitchenApi } from "../lib/kitchen-api";
import homeHtml from "../public/index.html?raw";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const pathname = new URL(request.url).pathname;
    if (pathname.startsWith('/api/')) {
      const pagesOrigin = 'https://hannah-aigit.github.io';
      const fromPages = request.headers.get('Origin') === pagesOrigin;
      if (request.method === 'OPTIONS') {
        return new Response(null, {status: fromPages ? 204 : 403, headers: fromPages ? {
          'Access-Control-Allow-Origin': pagesOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '600',
          'Vary': 'Origin',
        } : {}});
      }
      const response = await kitchenApi(request, env);
      if (!fromPages) return response;
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', pagesOrigin);
      headers.append('Vary', 'Origin');
      return new Response(response.body, {status: response.status, headers});
    }
    if (pathname === '/' || pathname === '/index.html') return new Response(homeHtml, {headers: {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

export default worker;
