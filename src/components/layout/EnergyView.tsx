import type { SolarState, PowerwallState, GridState, TeslaState, HomeLoadState, ControlStatus, TeslaControlKey, TeslaActions } from "@/types";
import { ChevronLeft } from "@/components/icons";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { SolarCard } from "@/components/cards/SolarCard";
import { PowerwallCard } from "@/components/cards/PowerwallCard";
import { TeslaCard } from "@/components/cards/TeslaCard";
import { EnergyFlowCard } from "@/components/cards/EnergyFlowCard";

// Lifted verbatim from HouseView's former Energy section — same cards, same
// grid, same props, nothing about them changed. Only the surrounding shell
// (header/back-chevron) is new, matching AutomationsView's pattern.
export function EnergyView({ solar, powerwall, grid, tesla, homeLoad, onBack, teslaControl, teslaActions }: {
  solar: SolarState; powerwall: PowerwallState; grid: GridState; tesla: TeslaState; homeLoad: HomeLoadState;
  onBack: () => void;
  teslaControl: Record<TeslaControlKey, ControlStatus>;
  teslaActions: TeslaActions;
}) {
  return (
    <div className="min-h-screen" style={{ background: "var(--tactus-bg-base)" }}>
      <div className="sticky top-0 z-10" style={{ background: "var(--tactus-bg-blur)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--tactus-bg-overlay)" }}>
        <div className="px-8 py-6 flex items-center gap-4">
          <button onClick={onBack} className="flex items-center justify-center size-[36px] rounded-full cursor-pointer hover:opacity-80 transition-opacity shrink-0" style={{ background: "var(--tactus-bg-overlay)", border: "1px solid var(--tactus-border-overlay)" }}>
            <div className="size-[18px]"><ChevronLeft /></div>
          </button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>My Home</span>
              <span style={{ color: "var(--tactus-text-faint)" }}>/</span>
              <h1 className="text-[18px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>Energy</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 flex flex-col gap-10">
        <div>
          <SectionHeading label="Energy" />
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            <SolarCard solar={solar} />
            <PowerwallCard powerwall={powerwall} grid={grid} />
            <TeslaCard tesla={tesla} control={teslaControl} actions={teslaActions} />
          </div>
          <div className="mt-4">
            <EnergyFlowCard solar={solar} powerwall={powerwall} grid={grid} homeLoad={homeLoad} tesla={tesla} />
          </div>
        </div>
      </div>
    </div>
  );
}
