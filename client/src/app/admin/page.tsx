import { AdminDashboard } from "@/features/admin/AdminDashboard";
import { RoleProtectedWorkspace } from "@/components/RoleProtectedWorkspace";

export default function AdminPage() {
  return <RoleProtectedWorkspace role="admin"><AdminDashboard /></RoleProtectedWorkspace>;
}
