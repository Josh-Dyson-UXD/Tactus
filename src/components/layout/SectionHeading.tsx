export function SectionHeading({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>{label}</p>
      {count !== undefined && <div className="flex items-center justify-center px-2 py-0.5 rounded-full" style={{ background: "var(--tactus-bg-overlay)" }}><p className="text-[10px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{count}</p></div>}
      <div className="flex-1 h-px" style={{ background: "var(--tactus-bg-overlay)" }} />
    </div>
  );
}
