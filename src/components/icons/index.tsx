import svgPaths from "@/imports/DashboardCanvas/svg-x3tut2cuat";

export function LightbulbIcon({ stroke }: { stroke: string }) {
  return <svg className="size-full" fill="none" viewBox="0 0 20 20"><path d={svgPaths.p3b32fe40} stroke={stroke} strokeLinecap="round" strokeWidth="2" /></svg>;
}

export function SunIcon({ stroke, size = 32 }: { stroke: string; size?: number }) {
  const path = size <= 16 ? svgPaths.p37a9e280 : size <= 24 ? svgPaths.p15137b00 : svgPaths.p30bad300;
  const vb   = size <= 16 ? "0 0 16 16"        : size <= 24 ? "0 0 24 24"        : "0 0 32 32";
  return <svg className="size-full" fill="none" viewBox={vb}><path d={path} stroke={stroke} strokeLinecap="round" strokeWidth="2" /></svg>;
}

export function WifiOffIcon({ stroke }: { stroke: string }) {
  return <svg className="size-full" fill="none" viewBox="0 0 22 22"><g clipPath="url(#wc)"><path d={svgPaths.p1899b200} stroke={stroke} strokeLinecap="round" strokeWidth="2" /></g><defs><clipPath id="wc"><rect width="22" height="22" fill="white" /></clipPath></defs></svg>;
}

export function AlertIcon({ stroke }: { stroke: string }) {
  return <svg className="size-full" fill="none" viewBox="0 0 10 16.668"><g clipPath="url(#ac)"><path d={svgPaths.p1eb93300} stroke={stroke} strokeLinecap="round" strokeWidth="2" /></g><defs><clipPath id="ac"><rect width="10" height="16.668" fill="white" /></clipPath></defs></svg>;
}

export function ChevronLeft() {
  return <svg className="size-full" fill="none" viewBox="0 0 24 24"><path d="M15 18L9 12L15 6" stroke="var(--tactus-text-secondary)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}
