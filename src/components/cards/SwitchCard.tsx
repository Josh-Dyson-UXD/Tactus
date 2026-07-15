import { motion } from "motion/react";
import { Plug } from "lucide-react";
import type { SwitchState } from "@/types";
import { withAlpha } from "@/lib/helpers";
import { AlertIcon, WifiOffIcon } from "@/components/icons";

const AMBER = "#F59E0B";
const RED = "#EF4444";
const MUTED = "#475569";

export function SwitchCard({ state, onToggle }: { state: SwitchState; onToggle: (on: boolean) => void }) {
  const { isOn, device, wattsNow, todayKwh, metered, status } = state;
  const isPending = status === "pending";
  const isError = status === "error";
  const accent = isError ? RED : isOn ? AMBER : MUTED;
  const accentLight = (isOn || isPending) && !isError ? withAlpha(accent, 0.13) : "var(--tactus-bg-hairline)";
  const pulse = isPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined;

  return (
    <div className="relative flex flex-col items-start justify-between p-[24px] rounded-tactus-2xl w-full" style={{ background: isOn ? "var(--tactus-bg-raised)" : "var(--tactus-bg-base)", border: isError ? `1px solid ${withAlpha(RED, 0.4)}` : "1px solid var(--tactus-border-default)", minHeight: metered ? 260 : 220 }}>
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-tactus-md size-[40px]" style={{ background: accentLight, animation: pulse }}>
            {isError
              ? <div className="size-[18px]"><AlertIcon stroke={RED} /></div>
              : <Plug size={18} color={isOn ? accent : "var(--tactus-text-muted)"} />}
          </div>
          <div className="flex flex-col gap-[2px]">
            <p className="text-[16px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: isOn ? "var(--tactus-text-primary)" : "var(--tactus-text-secondary)" }}>{device}</p>
            {isError && <p className="text-[11px] font-bold uppercase leading-none mt-[2px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-red)" }}>Unreachable</p>}
          </div>
        </div>
        <div className="flex items-center px-[10px] py-[4px] rounded-full relative" style={{ background: accentLight, animation: pulse }}>
          <div aria-hidden className="absolute inset-0 rounded-full pointer-events-none" style={{ border: `1px solid ${withAlpha(accent, 0.25)}` }} />
          <p className="text-[11px] font-bold uppercase leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: isOn ? accent : "var(--tactus-text-muted)" }}>{isError ? "ERROR" : isPending ? "SYNCING" : isOn ? "ON" : "OFF"}</p>
        </div>
      </div>

      {/* Rocker */}
      <div className="flex items-center justify-center w-full">
        <div className="relative flex flex-col items-center justify-center p-[8px] rounded-tactus-lg" style={{ width: 100, height: 140, background: "var(--tactus-bg-base)", border: "2px solid var(--tactus-border-default)" }}>
          <div className="flex flex-col gap-[2px] w-full flex-1 overflow-clip rounded-[14px]">
            <motion.button className="flex flex-1 flex-col items-center justify-center w-full cursor-pointer min-h-0 disabled:cursor-default" animate={{ background: isOn ? accent : "var(--tactus-border-default)" }} transition={{ duration: 0.2 }} whileTap={{ scale: 0.97 }}
              onClick={() => onToggle(true)} disabled={isPending || isError}>
              <p className="text-[11px] font-bold uppercase" style={{ fontFamily: "var(--tactus-font-sans)", color: isOn ? "var(--tactus-bg-base)" : "var(--tactus-text-muted)" }}>ON</p>
            </motion.button>
            <motion.button className="flex flex-1 flex-col items-center justify-center w-full relative cursor-pointer min-h-0 disabled:cursor-default" style={{ background: "var(--tactus-border-default)" }} whileTap={{ scale: 0.97 }}
              onClick={() => onToggle(false)} disabled={isPending || isError}>
              {isOn && <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "var(--tactus-inset-shadow)" }} />}
              <p className="text-[11px] font-bold uppercase relative" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>OFF</p>
            </motion.button>
            {!isOn && !isError && <div className="absolute left-[10px] right-[10px] top-1/2 -translate-y-1/2 h-px opacity-35" style={{ background: "var(--tactus-border-overlay)" }} />}
            {isError && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="size-[20px]"><WifiOffIcon stroke={RED} /></div></div>}
          </div>
        </div>
      </div>

      {/* Power stats — only for switches with a real power sensor */}
      {metered && (
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col gap-1">
            <p className="text-[11px] uppercase font-semibold tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Now</p>
            <p style={{ fontFamily: "var(--tactus-font-mono)", color: isOn ? "var(--tactus-text-primary)" : "var(--tactus-text-muted)", fontSize: 18, fontWeight: 600 }}>{isOn ? wattsNow : 0}<span style={{ fontSize: 12, color: "var(--tactus-text-muted)" }}> W</span></p>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <p className="text-[11px] uppercase font-semibold tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Today</p>
            <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-primary)", fontSize: 18, fontWeight: 600 }}>{todayKwh.toFixed(1)}<span style={{ fontSize: 12, color: "var(--tactus-text-muted)" }}> kWh</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
