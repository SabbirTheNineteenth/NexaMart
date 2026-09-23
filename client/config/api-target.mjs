const localApiTarget = "http://localhost:3000";
const localQaApiTargets = new Set([localApiTarget, "http://localhost:3004"]);

function isExactHttpsOrigin(value) {
  try {
    const origin = new URL(value);
    return origin.protocol === "https:" && origin.origin === value && !origin.hostname.includes("*");
  } catch {
    return false;
  }
}

export function resolveApiTarget(environment = process.env) {
  const apiTarget = environment.NEXAMART_API_URL;
  const isLocalQaTarget = environment.NEXAMART_LOCAL_QA === "1" && localQaApiTargets.has(apiTarget);
  if (environment.NODE_ENV === "production" && !apiTarget) {
    throw new Error("NEXAMART_API_URL is required in production");
  }
  if (environment.NODE_ENV === "production" && apiTarget && !isLocalQaTarget && !isExactHttpsOrigin(apiTarget)) {
    throw new Error("NEXAMART_API_URL must be an exact HTTPS origin in production");
  }
  return apiTarget ?? localApiTarget;
}
