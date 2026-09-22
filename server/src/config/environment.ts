type Environment = Record<string, string | undefined>;

const localClientOrigin = "http://localhost:3001";
const localQaClientOrigin = "http://localhost:3006";
const localQaApiPort = "3004";

export function isLocalQaRuntime(environment: Environment = process.env): boolean {
  return environment.NODE_ENV !== "production"
    && environment.NEXAMART_LOCAL_QA === "1"
    && environment.PORT === localQaApiPort;
}

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
    if (environment.NODE_ENV === "production") {
      throw new Error("NEXAMART_LOCAL_QA is not available in production.");
    }
    if (environment.PORT !== localQaApiPort) {
      throw new Error(`NEXAMART_LOCAL_QA requires PORT=${localQaApiPort}.`);
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
