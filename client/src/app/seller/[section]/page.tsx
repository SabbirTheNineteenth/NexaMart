import { notFound } from "next/navigation";
import { RoleProtectedWorkspace } from "@/components/RoleProtectedWorkspace";
import { SellerDashboard } from "@/features/seller/SellerDashboard";

const sections = new Set(["overview", "analytics", "profile", "catalog", "inventory", "taxonomy", "promotions", "fulfillment", "finance", "reviews", "notifications"]);

export default async function SellerSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.has(section)) notFound();
  return <RoleProtectedWorkspace role="seller"><SellerDashboard /></RoleProtectedWorkspace>;
}
