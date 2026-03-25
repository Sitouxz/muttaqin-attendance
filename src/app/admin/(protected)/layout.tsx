import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 bg-[#f0f4f3] overflow-auto">{children}</main>
    </div>
  );
}
