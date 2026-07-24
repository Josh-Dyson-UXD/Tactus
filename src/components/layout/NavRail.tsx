import { useState, useEffect } from "react";
import { Home, LayoutGrid, Zap, Wand2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MainView } from "@/types";
import { withAlpha } from "@/lib/helpers";

const AMBER_HEX = "#F59E0B"; // withAlpha() needs a real hex, not var() — see ClimateCard for the same pattern

const NAV_ITEMS: { id: MainView; label: string; Icon: LucideIcon }[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "devices", label: "Devices", Icon: LayoutGrid },
  { id: "energy", label: "Energy", Icon: Zap },
  { id: "automations", label: "Auto", Icon: Wand2 },
];

// The persistent app frame (redesign Phase 1) — replaces the old full-screen
// view-swap model. Fixed-width, full-height, always visible regardless of
// mainView.
export function NavRail({ active, onNavigate, alerts }: {
  active: MainView; onNavigate: (v: MainView) => void; alerts: Partial<Record<MainView, boolean>>;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  return (
    <nav className="flex flex-col items-center shrink-0" style={{ width: 66, height: "100vh", background: "var(--tactus-bg-recessed)", borderRight: "1px solid var(--tactus-border-subtle)", paddingTop: 20, paddingBottom: 16 }}>
      {/* Mark */}
      <div className="rounded-tactus-sm" style={{ width: 20, height: 20, background: "var(--tactus-amber)", marginBottom: 28 }} />

      {/* Nav items */}
      <div className="flex flex-col items-center gap-2 flex-1">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          const hasAlert = !!alerts[id];
          return (
            <button key={id} onClick={() => onNavigate(id)}
              className="flex flex-col items-center justify-center gap-1 cursor-pointer transition-opacity hover:opacity-90"
              style={{ width: 52, height: 52, borderRadius: 12, background: isActive ? withAlpha(AMBER_HEX, 0.12) : "transparent" }}>
              <div className="relative">
                <Icon size={18} color={isActive ? "var(--tactus-amber)" : "var(--tactus-text-muted)"} />
                {hasAlert && (
                  <div aria-hidden style={{
                    position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%",
                    background: "var(--tactus-amber)", border: "1.5px solid var(--tactus-bg-recessed)",
                  }} />
                )}
              </div>
              <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 8.5, fontWeight: 600, color: isActive ? "var(--tactus-amber)" : "var(--tactus-text-muted)", lineHeight: 1 }}>{label}</p>
            </button>
          );
        })}
      </div>

      {/* Clock */}
      <p style={{ fontFamily: "var(--tactus-font-mono)", fontSize: 11, fontWeight: 400, color: "var(--tactus-text-muted)" }}>{hh}:{mm}</p>
    </nav>
  );
}
