import type { AutomationState, SceneState } from "@/types";
import { ChevronLeft } from "@/components/icons";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { AutomationCard } from "@/components/cards/AutomationCard";
import { SceneCard } from "@/components/cards/SceneCard";

export function AutomationsView({ automations, scenes, onBack, onToggleAutomation, onRunAutomation, onActivateScene }: {
  automations: AutomationState[];
  scenes: SceneState[];
  onBack: () => void;
  onToggleAutomation: (id: string, enable: boolean) => void;
  onRunAutomation: (id: string) => void;
  onActivateScene: (id: string) => void;
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
              <h1 className="text-[18px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>Automations & Scenes</h1>
            </div>
            <p className="text-[13px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{automations.length} automation{automations.length === 1 ? "" : "s"} · {scenes.length} scene{scenes.length === 1 ? "" : "s"}</p>
          </div>
        </div>
      </div>

      <div className="p-8 flex flex-col gap-10">
        <div>
          <SectionHeading label="Automations" count={automations.length} />
          {automations.length > 0 ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", alignItems: "start" }}>
              {automations.map((a) => (
                <AutomationCard key={a.id} automation={a}
                  onToggle={(enable) => onToggleAutomation(a.id, enable)}
                  onRun={() => onRunAutomation(a.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-[13px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>No automations found in Home Assistant.</p>
          )}
        </div>

        <div>
          <SectionHeading label="Scenes" count={scenes.length} />
          {scenes.length > 0 ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", alignItems: "start" }}>
              {scenes.map((s) => (
                <SceneCard key={s.id} scene={s} onActivate={() => onActivateScene(s.id)} />
              ))}
            </div>
          ) : (
            <p className="text-[13px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>No scenes found in Home Assistant.</p>
          )}
        </div>
      </div>
    </div>
  );
}
