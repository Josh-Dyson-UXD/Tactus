import { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";
import { Clapperboard } from "lucide-react";
import type { SceneState } from "@/types";
import { withAlpha } from "@/lib/helpers";

const AMBER = "#F59E0B";
const PULSE_DURATION = 900;

// No persistent on/off state — scenes are fire-and-forget. The only feedback
// is a brief local glow pulse on tap, cleared automatically; nothing here is
// lifted to app state.
export function SceneCard({ scene, onActivate }: { scene: SceneState; onActivate: () => void }) {
  const [pulsing, setPulsing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleTap = () => {
    onActivate();
    setPulsing(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPulsing(false), PULSE_DURATION);
  };

  return (
    <motion.button onClick={handleTap} whileTap={{ scale: 0.97 }}
      className="relative flex flex-col items-start gap-3 p-5 rounded-tactus-xl w-full cursor-pointer text-left"
      style={{ background: pulsing ? withAlpha(AMBER, 0.1) : "var(--tactus-bg-raised)", border: `1px solid ${pulsing ? withAlpha(AMBER, 0.35) : "var(--tactus-border-default)"}`, transition: "background 0.3s ease, border 0.3s ease", boxShadow: pulsing ? `0 0 24px 0 ${withAlpha(AMBER, 0.2)}` : "none" }}>
      <div className="flex items-center justify-center rounded-tactus-md size-[40px]" style={{ background: withAlpha(AMBER, pulsing ? 0.2 : 0.12) }}>
        <Clapperboard size={18} color={AMBER} />
      </div>
      <div className="flex flex-col gap-[2px]">
        <p className="text-[15px] font-semibold leading-tight" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>{scene.name}</p>
        <p className="text-[11px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{pulsing ? "Activated" : "Tap to activate"}</p>
      </div>
    </motion.button>
  );
}
