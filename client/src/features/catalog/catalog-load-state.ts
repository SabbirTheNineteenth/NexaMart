export const catalogLoadSuccess = () => ({ error: "" });

export const catalogLoadFailure = (reason: unknown) => {
  if (reason instanceof DOMException && reason.name === "AbortError") return null;
  return { error: reason instanceof Error ? reason.message : "Unable to load products" };
};
