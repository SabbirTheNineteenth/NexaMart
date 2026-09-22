type Environment = Record<string, string | undefined>;

const localClientOrigin = "http://localhost:3001";
const localQaClientOrigin = "http://localhost:3006";

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

  if (environment.NEXAMART_LOCAL_QA === "1") {
    if (environment.PORT !== "3004") {
      throw new Error("NEXAMART_LOCAL_QA requires PORT=3004.");
    }

    return localQaClientOrigin;
  }

  if (environment.NODE_ENV === "production" && !clientOrigin) {
    throw new Error("CLIENT_ORIGIN is required in production");
  }
  if (environment.NODE_ENV === "production" && clientOrigin && !isExactHttpsOrigin(clientOrigin)) {
    throw new Error("CLIENT_ORIGIN must be an exact HTTPS origin in production");
  }
  return clientOrigin ?? localClientOrigin;
}
