import { assertLocalDemoCatalogSeedExecutionGuard, type LocalDemoCatalogSeedEnvironment } from "./runLocalDemoSeed.js";

export const LOCAL_CUSTOMER_QA_EMAIL = "local-customer-qa@nexamart.local";

export type LocalCustomerQaFixtureRepository = {
  upsertCustomer(input: { name: string; email: string; passwordHash: string; role: "customer" }): Promise<void>;
};

/**
 * Seeds one development-only customer after the shared local-demo guard has
 * accepted the execution environment. Password material is supplied only by
 * the caller and is never returned or logged.
 */
export async function runLocalCustomerQaFixtureSeed(
  repository: LocalCustomerQaFixtureRepository,
  environment: LocalDemoCatalogSeedEnvironment,
  passwordHash: string,
) {
  assertLocalDemoCatalogSeedExecutionGuard(environment);
  await repository.upsertCustomer({
    name: "Local Customer QA",
    email: LOCAL_CUSTOMER_QA_EMAIL,
    passwordHash,
    role: "customer",
  });
  return { email: LOCAL_CUSTOMER_QA_EMAIL, role: "customer" as const };
}

type InProcessApp = { request(input: RequestInfo | URL, init?: RequestInit): Response | Promise<Response> };

/** Uses the existing auth routes through an in-process loopback request. */
export async function verifyLocalCustomerQaFixture(app: InProcessApp, password: string, report: (line: string) => void): Promise<void> {
  const login = await app.request("http://127.0.0.1/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: LOCAL_CUSTOMER_QA_EMAIL, password }),
  });
  if (login.status !== 200) throw new Error("Local customer QA verification failed at login.");

  const setCookie = login.headers.get("set-cookie");
  const sessionCookie = setCookie?.split(";", 1)[0];
  if (!sessionCookie) throw new Error("Local customer QA verification did not receive a session.");

  const session = await app.request("http://127.0.0.1/api/auth/me", { headers: { Cookie: sessionCookie } });
  if (session.status !== 200) throw new Error("Local customer QA verification failed at session access.");
  const body = await session.json() as { account?: { role?: string } };
  if (body.account?.role !== "customer") throw new Error("Local customer QA verification returned an unexpected account role.");

  report("Local customer QA verification passed: login=200, session=200, role=customer.");
}
