"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/lib/auth/use-auth";

import {
  LayoutDashboard,
  FolderKanban,
  ShoppingCart,
  Truck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Search,
  LogOut,
} from "lucide-react";

export default function SupervisorSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  // ORDEN JERÁRQUICO CORRECTO
  const menu = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/supervisor" },

    // Núcleo del sistema
    { icon: FolderKanban, label: "Proyectos", path: "/supervisor/projects" },
    { icon: ShoppingCart, label: "Compras", path: "/supervisor/purchases" },
    { icon: Truck, label: "Entregas", path: "/supervisor/deliveries" },
    { icon: FileText, label: "Documentos", path: "/supervisor/documents" },

    // Control y Auditoría
    {
      icon: CheckCircle2,
      label: "Validación",
      path: "/supervisor/validation",
    },
    { icon: AlertTriangle, label: "Alertas", path: "/supervisor/alerts" },

    // Utilitario
    { icon: Search, label: "Buscar", path: "/supervisor/search" },
  ];

  return (
    <aside className="sv-sidebar">
      {/* HEADER */}
      <div className="sv-sidebar-header">
        <h2 className="sv-logo">SUPERVISOR</h2>
      </div>

      {/* MENU */}
      <nav className="sv-menu">
        {menu.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`sv-menu-item ${active ? "active" : ""}`}
            >
              <Icon className="sv-menu-icon" size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* LOGOUT */}
      <button className="sv-logout-btn" onClick={logout}>
        <LogOut size={18} />
        <span>Cerrar sesión</span>
      </button>
    </aside>
  );
}
