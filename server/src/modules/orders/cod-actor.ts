export function codActorColumns(actor: { kind: "seller" | "admin" | "n8n"; id: string }) {
  return actor.kind === "n8n"
    ? { actorId: null, serviceActorId: actor.id }
    : { actorId: actor.id, serviceActorId: null };
}
