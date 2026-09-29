import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { serviceActors } from "../db/schema/index.js";

const serviceKey = "n8n_cod_local";

export async function getOrCreateN8nCodActor(database = db): Promise<string> {
  const [created] = await database.insert(serviceActors).values({ key: serviceKey }).onConflictDoNothing({ target: serviceActors.key }).returning({ id: serviceActors.id });
  if (created) return created.id;
  const [existing] = await database.select({ id: serviceActors.id }).from(serviceActors).where(eq(serviceActors.key, serviceKey)).limit(1);
  if (!existing) throw new Error("Service actor could not be resolved");
  return existing.id;
}
