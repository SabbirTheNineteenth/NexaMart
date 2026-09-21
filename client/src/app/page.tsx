import { Storefront } from "@/features/catalog/Storefront";
import { connection } from "next/server";

export default async function HomePage() {
  await connection();
  return <Storefront />;
}
