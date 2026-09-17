import { AdminDashboard } from "@/features/admin/AdminDashboard";
import { RoleProtectedWorkspace } from "@/components/RoleProtectedWorkspace";

export default function CreateBrandPage() {
  return <RoleProtectedWorkspace role="admin"><AdminDashboard /></RoleProtectedWorkspace>;
}
