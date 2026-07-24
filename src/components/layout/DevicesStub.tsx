import { LayoutGrid } from "lucide-react";

// Phase 1 placeholder — the real Devices board is Phase 3.
export function DevicesStub() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: "var(--tactus-bg-base)" }}>
      <LayoutGrid size={28} color="var(--tactus-text-muted)" />
      <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 13, color: "var(--tactus-text-muted)" }}>Devices board — coming soon</p>
    </div>
  );
}
