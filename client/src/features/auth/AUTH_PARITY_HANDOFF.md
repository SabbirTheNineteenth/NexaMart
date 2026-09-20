# Auth wrong-role recovery handoff

Wrong-role sign-in feedback now links directly to the matching real sign-in route. Existing API calls, role validation, redirects, pending states, validation, and error handling are unchanged.

Integration route/auth checks passed 7/7. The isolated worktree recorded passing typecheck, lint (with one unrelated account image warning), local-QA build, and signed-out responsive captures of the real auth routes. The conditional wrong-role state remains unrendered without a real mismatched sign-in response.
