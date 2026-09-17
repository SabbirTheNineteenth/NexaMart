import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../src/app.js";
import { createUpstashAuthAdmissionLimiter } from "../src/modules/auth/upstash-auth-admission-limiter.js";

type FetchHandler = (request: Request) => Response | Promise<Response>;

/** Keep Vercel's Node runtime from consuming the stream before the adapter buffers it. */
export const config = {
  api: {
    bodyParser: false,
  },
};

type RuntimeEnvironment = Record<string, string | undefined>;

function toHeaders(headers: IncomingHttpHeaders): Headers {
  const requestHeaders = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) requestHeaders.append(name, item);
    } else {
      requestHeaders.set(name, String(value));
    }
  }
  return requestHeaders;
}

async function readBody(request: IncomingMessage): Promise<Uint8Array | undefined> {
  if (request.method === "GET" || request.method === "HEAD") return undefined;

  const chunks: Uint8Array[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return chunks.length === 0 ? undefined : Buffer.concat(chunks);
}

async function toRequest(request: IncomingMessage): Promise<Request> {
  const forwardedProtocol = request.headers["x-forwarded-proto"];
  const protocolValue = Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol;
  const protocol = protocolValue?.split(",")[0]?.trim() || "https";
  const host = request.headers.host ?? "localhost";
  const body = await readBody(request);

  return new Request(new URL(request.url ?? "/", `${protocol}://${host}`), {
    method: request.method ?? "GET",
    headers: toHeaders(request.headers),
    body,
    duplex: body ? "half" : undefined,
  } as RequestInit);
}

function responseCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  return headers.getSetCookie?.() ?? (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : []);
}

async function writeResponse(response: Response, target: ServerResponse): Promise<void> {
  target.statusCode = response.status;
  for (const [name, value] of response.headers) {
    if (name !== "set-cookie") target.setHeader(name, value);
  }
  const cookies = responseCookies(response);
  if (cookies.length > 0) target.setHeader("set-cookie", cookies);
  target.end(Buffer.from(await response.arrayBuffer()));
}

export function createVercelHandler(fetch: FetchHandler) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    await writeResponse(await fetch(await toRequest(request)), response);
  };
}

function createProductionDependencies(environment: RuntimeEnvironment) {
  if (environment.NODE_ENV !== "production") {
    throw new Error("NODE_ENV must be production for the Vercel API");
  }

  const databaseUrl = environment.DATABASE_URL?.trim();
  const url = environment.UPSTASH_REDIS_REST_URL?.trim();
  const token = environment.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!databaseUrl || !url || !token) {
    throw new Error("DATABASE_URL, UPSTASH_REDIS_REST_URL, and UPSTASH_REDIS_REST_TOKEN are required in production");
  }
  return { authAdmission: { limiter: createUpstashAuthAdmissionLimiter(url, token) } };
}

let handler: ReturnType<typeof createVercelHandler> | undefined;

function getHandler() {
  if (!handler) handler = createVercelHandler(createApp(process.env, createProductionDependencies(process.env)).fetch);
  return handler;
}

export default async function vercelHandler(request: VercelRequest, response: VercelResponse): Promise<void> {
  await getHandler()(request, response);
}
