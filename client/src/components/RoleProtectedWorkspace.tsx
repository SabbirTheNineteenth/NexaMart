"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ApiError, getJSON } from "@/lib/api";
import type { Account } from "@/types/account";

type WorkspaceRole = "seller" | "admin";
type GateState = { kind: "checking" } | { kind: "ready" } | { kind: "wrong-role"; account: Account } | { kind: "access-error"; status: 401 | 403 };

function roleLabel(role: Account["role"]): string {
  return role === "admin" ? "administrator" : role;
}

function apiPath(input: RequestInfo | URL): string | null {
  const value = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  try {
    return new URL(value, window.location.origin).pathname;
  } catch {
    return null;
  }
}

export function RoleProtectedWorkspace({ role, children }: { role: WorkspaceRole; children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GateState>({ kind: "checking" });
  const recoveryPending = useRef(false);

  const recoverSession = useCallback(async (status: 401 | 403) => {
    if (recoveryPending.current) return;
    recoveryPending.current = true;
    setState({ kind: "checking" });
    try {
      const { account } = await getJSON<{ account: Account }>("/auth/me");
      if (account.role !== role) {
        setState({ kind: "wrong-role", account });
        return;
      }
      setState(status === 403 ? { kind: "access-error", status } : { kind: "ready" });
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        router.replace(`/login/${role}`);
        return;
      }
      setState({ kind: "access-error", status });
    } finally {
      recoveryPending.current = false;
    }
  }, [role, router]);

  useEffect(() => {
    const initialResolution = window.setTimeout(() => {
      void recoverSession(401);
    }, 0);
    return () => {
      window.clearTimeout(initialResolution);
    };
  }, [recoverSession]);

  useEffect(() => {
    if (state.kind !== "ready") return;
    const originalFetch = window.fetch;
    const guardedFetch: typeof window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const path = apiPath(input);
      if (path?.startsWith("/api/") && path !== "/api/auth/me" && (response.status === 401 || response.status === 403)) {
        void recoverSession(response.status);
      }
      return response;
    };
    window.fetch = guardedFetch;
    return () => {
      if (window.fetch === guardedFetch) window.fetch = originalFetch;
    };
  }, [recoverSession, state.kind]);

  if (state.kind === "ready") return <>{children}</>;
  if (state.kind === "checking") return <main className="app-state-shell" aria-busy="true"><section className="app-state-card"><p role="status">Checking workspace access…</p></section></main>;
  if (state.kind === "wrong-role") return <main className="app-state-shell"><section className="app-state-card" aria-labelledby="workspace-role-heading"><p className="app-state-kicker">Access state</p><h1 id="workspace-role-heading">This workspace requires a {role} account.</h1><p>You are signed in as a {roleLabel(state.account.role)}. Workspace access is determined by your current session.</p><div className="app-state-actions"><Link className="primary-button" href={`/login/${role}`}>Sign in as {roleLabel(role)}</Link><Link className="text-link" href="/">Return to marketplace</Link></div></section></main>;
  return <main className="app-state-shell"><section className="app-state-card" aria-labelledby="workspace-access-heading"><p className="app-state-kicker">Access state</p><h1 id="workspace-access-heading">Workspace access needs attention.</h1><p>{state.status === 401 ? "Your session is no longer available. Sign in to continue." : "The API did not grant access to this workspace. Check your assigned access or sign in again."}</p><div className="app-state-actions"><button className="primary-button" type="button" onClick={() => void recoverSession(state.status)}>Check access again</button><Link className="text-link" href={`/login/${role}`}>Go to {role} sign in</Link></div></section></main>;
}
