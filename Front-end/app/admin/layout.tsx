/* ============================================
   LAYOUT ADMINISTRATIVO TRACKBUILD
============================================ */

import "../globals.css";
import "@/styles/admin-layout.css";

import AdminSidebar from "@/components/admin/AdminSidebar";
import Breadcrumbs from "@/components/navigation/Breadcrumbs";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main content */}
      <div className="admin-main">
        {/* Header superior */}
        <header className="admin-header">
          <Breadcrumbs />
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
