import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, getJSON } from "../src/lib/api.js";

async function withFailedResponse(response: Response, assertion: () => Promise<void>) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => response;
  try {
    await assertion();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function expectErrorMessage(status: number, expectedMessage: string) {
  await withFailedResponse(
    new Response(JSON.stringify({ error: "untrusted server detail" }), { status, headers: { "Content-Type": "application/json" } }),
    async () => assert.rejects(
      getJSON("/catalog"),
      (reason: unknown) => reason instanceof ApiError && reason.status === status && reason.message === expectedMessage,
    ),
  );
}

test("getJSON replaces a generic 500 JSON error with safe recovery guidance", async () => {
  await expectErrorMessage(500, "The service is temporarily unavailable. Please try again.");
});

test("getJSON replaces a malformed 502 response with safe recovery guidance", async () => {
  await withFailedResponse(
    new Response("gateway trace: internal-host-name", { status: 502, headers: { "Content-Type": "text/html" } }),
    async () => assert.rejects(
      getJSON("/catalog"),
      (reason: unknown) => reason instanceof ApiError
        && reason.status === 502
        && reason.message === "The service is temporarily unavailable. Please try again.",
    ),
  );
});

test("getJSON replaces an internal network failure with safe recovery guidance", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed: connect ECONNREFUSED 10.0.0.42:5432 internal-db");
  };
  try {
    await assert.rejects(
      getJSON("/catalog"),
      (reason: unknown) => reason instanceof ApiError
        && reason.status === 0
        && reason.message === "Unable to reach the service. Please check your connection and try again.",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getJSON preserves an AbortController rejection for feature loaders", async () => {
  const controller = new AbortController();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    controller.abort();
    throw controller.signal.reason;
  };
  try {
    await assert.rejects(
      getJSON("/catalog", controller.signal),
      (reason: unknown) => reason === controller.signal.reason
        && reason instanceof DOMException
        && reason.name === "AbortError",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getJSON replaces an untrusted validation error with safe recovery guidance", async () => {
  await expectErrorMessage(400, "Please review the submitted information and try again.");
});

test("getJSON gives every client error class safe actionable guidance while preserving status", async () => {
  for (const [status, message] of [
    [401, "Authentication required. Please sign in and try again."],
    [403, "You do not have permission to perform this action."],
    [404, "The requested resource is no longer available."],
    [409, "The request conflicts with the current state. Refresh and try again."],
    [422, "Please review the submitted information and try again."],
    [429, "Too many requests. Please try again shortly."],
    [418, "Request failed. Please try again."],
  ] as const) {
    await expectErrorMessage(status, message);
  }
});
