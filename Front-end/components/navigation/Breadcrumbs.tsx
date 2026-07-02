"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Breadcrumbs() {
  const pathname = usePathname();

  // Dividir URL en partes
  const parts = pathname.split("/").filter(Boolean);

  // Remover "admin" de la visualización
  const cleanParts = parts[0] === "admin" ? parts.slice(1) : parts;

  const crumbs = cleanParts.map((part, idx) => {
    const href = "/admin/" + cleanParts.slice(0, idx + 1).join("/");

    const isNumericId = /^[0-9]+$/.test(part);

    let label = isNumericId
      ? "Detalle"
      : part.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); // Capitaliza cada palabra

    return { href, label };
  });

  return (
    <nav className="breadcrumbs">
      {/* Link principal */}
      <Link href="/admin" className="crumb">
        Inicio
      </Link>

      {crumbs.map((c, i) => (
        <span key={i} className="crumb">
          <span className="crumb-sep"> / </span>
          <Link href={c.href} className="crumb-link">
            {c.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
