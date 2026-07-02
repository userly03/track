"use client";

import SupervisorSidebar from "@/components/supervisor/SupervisorSidebar";
import "@/styles/supervisor-layout.css";

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="sv-layout">
      {/* SIDEBAR */}
      <SupervisorSidebar />

      {/* MAIN CONTENT AREA */}
      <main className="sv-main">
        <div className="sv-main-inner">{children}</div>
      </main>
    </div>
  );
}
