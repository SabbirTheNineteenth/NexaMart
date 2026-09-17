import { AdminDashboard } from "@/features/admin/AdminDashboard";
import { RoleProtectedWorkspace } from "@/components/RoleProtectedWorkspace";

export default function CreateSubcategoryPage() {
  return <RoleProtectedWorkspace role="admin"><AdminDashboard /></RoleProtectedWorkspace>;
}
