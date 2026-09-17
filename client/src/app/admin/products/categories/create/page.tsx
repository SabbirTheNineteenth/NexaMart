import { AdminDashboard } from "@/features/admin/AdminDashboard";
import { RoleProtectedWorkspace } from "@/components/RoleProtectedWorkspace";

export default function CreateCategoryPage() {
  return <RoleProtectedWorkspace role="admin"><AdminDashboard /></RoleProtectedWorkspace>;
}
