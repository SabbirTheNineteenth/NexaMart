import { AdminDashboard } from "@/features/admin/AdminDashboard";
import { RoleProtectedWorkspace } from "@/components/RoleProtectedWorkspace";

export default function AddProductPage() {
  return <RoleProtectedWorkspace role="admin"><AdminDashboard /></RoleProtectedWorkspace>;
}
