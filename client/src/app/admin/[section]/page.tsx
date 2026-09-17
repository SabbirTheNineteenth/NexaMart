import { notFound } from "next/navigation";
import { RoleProtectedWorkspace } from "@/components/RoleProtectedWorkspace";
import { AdminDashboard } from "@/features/admin/AdminDashboard";

const sections = new Set(["overview", "applications", "orders", "feedback", "finance", "analytics", "audit", "sellers", "products", "taxonomy", "promotions", "accounts"]);

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.has(section)) notFound();
  return <RoleProtectedWorkspace role="admin"><AdminDashboard /></RoleProtectedWorkspace>;
}
