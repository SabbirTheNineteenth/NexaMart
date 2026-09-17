type Environment = Record<string, string | undefined>;

const localClientOrigin = "http://localhost:3001";

function isExactHttpsOrigin(value: string): boolean {
  try {
    const origin = new URL(value);
    return origin.protocol === "https:" && origin.origin === value && !origin.hostname.includes("*");
  } catch {
    return false;
  }
}

export function resolveClientOrigin(environment: Environment = process.env): string {
  const clientOrigin = environment.CLIENT_ORIGIN;
  if (environment.NODE_ENV === "production" && !clientOrigin) {
    throw new Error("CLIENT_ORIGIN is required in production");
  }
  if (environment.NODE_ENV === "production" && clientOrigin && !isExactHttpsOrigin(clientOrigin)) {
    throw new Error("CLIENT_ORIGIN must be an exact HTTPS origin in production");
  }
  return clientOrigin ?? localClientOrigin;
}
