import { redirect } from "next/navigation";
import { getActingAdmin } from "@/lib/auth/admin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // An authenticated Supabase user is not automatically an admin: access
  // requires an active row in public.admins.
  const admin = await getActingAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 bg-[#f0f4f3] overflow-auto">{children}</main>
    </div>
  );
}
