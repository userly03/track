"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/lib/auth/use-auth";

import {
  LayoutDashboard,
  FolderKanban,
  ShoppingCart,
  Truck,
  Layers,
  FileText,
  CheckCircle2,
  AlertTriangle,
  LineChart,
  Search,
  LogOut,
} from "lucide-react";

const menu = [
  {
    label: "General",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
      { icon: FolderKanban, label: "Proyectos", path: "/admin/projects" },
      { icon: ShoppingCart, label: "Compras", path: "/admin/purchases" },
      { icon: Truck, label: "Entregas", path: "/admin/deliveries" },
      { icon: Layers, label: "Avances", path: "/admin/progress" },
    ],
  },
  {
    label: "Documentación",
    items: [{ icon: FileText, label: "Documentos", path: "/admin/documents" }],
  },
  {
    label: "Control y Riesgos",
    items: [
      {
        icon: CheckCircle2,
        label: "Validación",
        path: "/admin/validation",
      },
      { icon: AlertTriangle, label: "Alertas", path: "/admin/alerts" },
      { icon: LineChart, label: "Mercado (Precios)", path: "/admin/market" },
      { icon: LineChart, label: "Reportes PDF", path: "/admin/reporting" },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const auth = useAuth();

  function logout() {
    void auth.logout();
  }

  return (
    <aside className="admin-sidebar">
      <h2 className="sidebar-title">TrackBuild Admin</h2>

      {/* Menú principal */}
      {menu.map((section) => (
        <div key={section.label} className="sidebar-section">
          <div className="sidebar-section-label">{section.label}</div>

          <nav className="sidebar-nav">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`sidebar-link ${active ? "active" : ""}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ))}

      {/* === SECCIÓN FINAL: Cerrar sesión === */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Cuenta</div>

        <button onClick={logout} className="sidebar-link logout-button">
          <LogOut size={18} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
