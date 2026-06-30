import svgPaths from "./svg-x3tut2cuat";

function Lightbulb() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lightbulb">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lightbulb">
          <path d={svgPaths.p3b32fe40} id="Vector" stroke="var(--stroke-0, #475569)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Icon() {
  return (
    <div className="bg-[rgba(255,255,255,0.02)] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[40px]" data-name="icon">
      <Lightbulb />
    </div>
  );
}

function Frame() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Instrument_Sans:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#94a3b8] text-[18px]" style={{ fontVariationSettings: '"wdth" 100' }}>
        Living Room
      </p>
      <p className="font-['Instrument_Sans:Regular',sans-serif] font-normal relative shrink-0 text-[#475569] text-[13px]" style={{ fontVariationSettings: '"wdth" 100' }}>
        Ceiling Lamp
      </p>
    </div>
  );
}

function Title() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="title">
      <Icon />
      <Frame />
    </div>
  );
}

function StatusPill() {
  return (
    <div className="bg-[rgba(255,255,255,0.02)] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[99px] shrink-0" data-name="status-pill">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[99px]" />
      <p className="[word-break:break-word] font-['Instrument_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#475569] text-[11px] uppercase whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        OFF
      </p>
    </div>
  );
}

function Header() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="header">
      <Title />
      <StatusPill />
    </div>
  );
}

function RockerTop() {
  return (
    <div className="bg-[#242936] content-stretch flex flex-[1_0_0] flex-col items-center justify-center min-h-px relative w-full" data-name="rocker-top">
      <p className="[word-break:break-word] font-['Instrument_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#475569] text-[12px] uppercase whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        ON
      </p>
    </div>
  );
}

function RockerBottom() {
  return (
    <div className="bg-[#242936] content-stretch flex flex-[1_0_0] flex-col items-center justify-center min-h-px relative w-full" data-name="rocker-bottom">
      <p className="[word-break:break-word] font-['Instrument_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#475569] text-[12px] uppercase whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        OFF
      </p>
    </div>
  );
}

function RockerFrame() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start min-h-px overflow-clip relative rounded-[18px] w-full" data-name="rocker-frame">
      <RockerTop />
      <RockerBottom />
      <div className="-translate-y-1/2 absolute bg-[rgba(255,255,255,0.08)] h-px left-[12px] opacity-35 right-[12px] top-1/2" data-name="power-off-line" />
    </div>
  );
}

function SwitchContainer() {
  return (
    <div className="bg-[#0b0c10] content-stretch flex flex-col h-[180px] items-center justify-center p-[8px] relative rounded-[24px] shrink-0 w-[120px]" data-name="switch-container">
      <div aria-hidden className="absolute border-2 border-[#242936] border-solid inset-0 pointer-events-none rounded-[24px]" />
      <RockerFrame />
    </div>
  );
}

function TopControls() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full" data-name="top-controls">
      <SwitchContainer />
    </div>
  );
}

function Sun() {
  return (
    <div className="relative shrink-0 size-[32px]" data-name="sun">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <g id="sun">
          <path d={svgPaths.p30bad300} id="Vector" stroke="var(--stroke-0, #242936)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Brightness() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 w-[72px]" data-name="brightness">
      <Sun />
    </div>
  );
}

function ColorDot() {
  return <div className="bg-[#242936] relative rounded-[16px] shrink-0 size-[32px]" data-name="color-dot" />;
}

function Color() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 w-[72px]" data-name="color">
      <ColorDot />
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[40px] items-center justify-center min-w-px relative">
      <Brightness />
      <Color />
    </div>
  );
}

function BottomSummary1() {
  return (
    <div className="content-stretch flex h-[100px] items-start justify-center pt-[16px] relative shrink-0 w-full" data-name="bottom-summary">
      <Frame1 />
    </div>
  );
}

function BottomSummary() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[16px] relative shrink-0 w-full" data-name="bottom-summary">
      <BottomSummary1 />
    </div>
  );
}

function LightCardOffUnpowered() {
  return (
    <div className="bg-[#0b0c10] content-stretch flex flex-col items-start justify-between min-h-[480px] p-[24px] relative rounded-[32px] shrink-0 w-[320px]" data-name="light-card-off-unpowered">
      <div aria-hidden className="absolute border border-[#242936] border-solid inset-0 pointer-events-none rounded-[32px]" />
      <Header />
      <TopControls />
      <BottomSummary />
    </div>
  );
}

function Lightbulb1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lightbulb">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lightbulb">
          <path d={svgPaths.p3b32fe40} id="Vector" stroke="var(--stroke-0, #FFF9E5)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Icon1() {
  return (
    <div className="bg-[rgba(255,249,229,0.13)] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[40px]" data-name="icon">
      <Lightbulb1 />
    </div>
  );
}

function Frame2() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Instrument_Sans:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#f8fafc] text-[18px]" style={{ fontVariationSettings: '"wdth" 100' }}>
        Living Room
      </p>
      <p className="font-['Instrument_Sans:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[13px]" style={{ fontVariationSettings: '"wdth" 100' }}>
        Ceiling Lamp
      </p>
    </div>
  );
}

function Title1() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="title">
      <Icon1 />
      <Frame2 />
    </div>
  );
}

function StatusPill1() {
  return (
    <div className="bg-[rgba(255,249,229,0.13)] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[99px] shrink-0" data-name="status-pill">
      <div aria-hidden className="absolute border border-[rgba(255,249,229,0.25)] border-solid inset-0 pointer-events-none rounded-[99px]" />
      <p className="[word-break:break-word] font-['Instrument_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#fff9e5] text-[11px] uppercase whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        ON
      </p>
    </div>
  );
}

function Header1() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="header">
      <Title1 />
      <StatusPill1 />
    </div>
  );
}

function RockerTop1() {
  return (
    <div className="bg-[#fff9e5] content-stretch flex flex-[1_0_0] flex-col items-center justify-center min-h-px relative w-full" data-name="rocker-top">
      <p className="[word-break:break-word] font-['Instrument_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b0c10] text-[12px] uppercase whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        ON
      </p>
    </div>
  );
}

function RockerBottom1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col items-center justify-center min-h-px relative w-full" data-name="rocker-bottom">
      <div aria-hidden className="absolute bg-[#242936] inset-0 pointer-events-none" />
      <p className="[word-break:break-word] font-['Instrument_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#475569] text-[12px] uppercase whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        OFF
      </p>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_-4px_8px_0px_rgba(0,0,0,0.5)]" />
    </div>
  );
}

function RockerFrame1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start min-h-px overflow-clip relative rounded-[18px] w-full" data-name="rocker-frame">
      <RockerTop1 />
      <RockerBottom1 />
    </div>
  );
}

function SwitchContainer1() {
  return (
    <div className="bg-[#0b0c10] content-stretch flex flex-col h-[180px] items-center justify-center p-[8px] relative rounded-[24px] shrink-0 w-[120px]" data-name="switch-container">
      <div aria-hidden className="absolute border-2 border-[#242936] border-solid inset-0 pointer-events-none rounded-[24px]" />
      <RockerFrame1 />
    </div>
  );
}

function TopControls1() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full" data-name="top-controls">
      <SwitchContainer1 />
    </div>
  );
}

function Sun1() {
  return (
    <div className="relative shrink-0 size-[32px]" data-name="sun">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <g id="sun">
          <path d={svgPaths.p30bad300} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Brightness1() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] items-center justify-center relative shrink-0 w-[72px]" data-name="brightness">
      <Sun1 />
      <p className="[word-break:break-word] font-['Instrument_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#f8fafc] text-[13px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        75%
      </p>
    </div>
  );
}

function ColorDot1() {
  return <div className="bg-[#fff9e5] relative rounded-[16px] shrink-0 size-[32px]" data-name="color-dot" />;
}

function Color1() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] items-center justify-center relative shrink-0 w-[72px]" data-name="color">
      <ColorDot1 />
      <p className="[word-break:break-word] font-['Instrument_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#f8fafc] text-[13px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Warm
      </p>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[40px] items-center justify-center min-w-px relative">
      <Brightness1 />
      <Color1 />
    </div>
  );
}

function BottomSummary2() {
  return (
    <div className="content-stretch flex h-[100px] items-start justify-center pt-[16px] relative shrink-0 w-full" data-name="bottom-summary">
      <Frame3 />
    </div>
  );
}

function LightCardDefault() {
  return (
    <div className="bg-[#161922] content-stretch flex flex-col h-[480px] items-start justify-between min-h-[480px] p-[24px] relative rounded-[32px] shrink-0 w-[320px]" data-name="light-card-default">
      <div aria-hidden className="absolute border border-[#242936] border-solid inset-0 pointer-events-none rounded-[32px]" />
      <Header1 />
      <TopControls1 />
      <BottomSummary2 />
    </div>
  );
}

function Lightbulb2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lightbulb">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lightbulb">
          <path d={svgPaths.p3b32fe40} id="Vector" stroke="var(--stroke-0, #FFF9E5)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Icon2() {
  return (
    <div className="bg-[rgba(255,249,229,0.13)] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[40px]" data-name="icon">
      <Lightbulb2 />
    </div>
  );
}

function Frame4() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Instrument_Sans:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#f8fafc] text-[18px]" style={{ fontVariationSettings: '"wdth" 100' }}>
        Living Room
      </p>
      <p className="font-['Instrument_Sans:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[13px]" style={{ fontVariationSettings: '"wdth" 100' }}>
        Ceiling Lamp
      </p>
    </div>
  );
}

function Title2() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="title">
      <Icon2 />
      <Frame4 />
    </div>
  );
}

function StatusPill2() {
  return (
    <div className="bg-[rgba(255,249,229,0.13)] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[99px] shrink-0" data-name="status-pill">
      <div aria-hidden className="absolute border border-[rgba(255,249,229,0.25)] border-solid inset-0 pointer-events-none rounded-[99px]" />
      <p className="[word-break:break-word] font-['Instrument_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#fff9e5] text-[11px] uppercase whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        ON
      </p>
    </div>
  );
}

function Header2() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="header">
      <Title2 />
      <StatusPill2 />
    </div>
  );
}

function RockerTop2() {
  return (
    <div className="bg-[#fff9e5] content-stretch flex flex-[1_0_0] flex-col items-center justify-center min-h-px relative w-full" data-name="rocker-top">
      <p className="[word-break:break-word] font-['Instrument_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b0c10] text-[12px] uppercase whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        ON
      </p>
    </div>
  );
}

function RockerBottom2() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col items-center justify-center min-h-px relative w-full" data-name="rocker-bottom">
      <div aria-hidden className="absolute bg-[#242936] inset-0 pointer-events-none" />
      <p className="[word-break:break-word] font-['Instrument_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#475569] text-[12px] uppercase whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        OFF
      </p>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_-4px_8px_0px_rgba(0,0,0,0.5)]" />
    </div>
  );
}

function RockerFrame2() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start min-h-px overflow-clip relative rounded-[18px] w-full" data-name="rocker-frame">
      <RockerTop2 />
      <RockerBottom2 />
    </div>
  );
}

function SwitchContainer2() {
  return (
    <div className="bg-[#0b0c10] content-stretch flex flex-col h-[180px] items-center justify-center p-[8px] relative rounded-[24px] shrink-0 w-[120px]" data-name="switch-container">
      <div aria-hidden className="absolute border-2 border-[#242936] border-solid inset-0 pointer-events-none rounded-[24px]" />
      <RockerFrame2 />
    </div>
  );
}

function TopControls2() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full" data-name="top-controls">
      <SwitchContainer2 />
    </div>
  );
}

function SwatchActive() {
  return (
    <div className="relative shrink-0 size-[36px]" data-name="swatch-active">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 36 36">
        <g id="swatch-active">
          <rect height="34" rx="17" stroke="var(--stroke-0, #FFF9E5)" strokeWidth="2" width="34" x="1" y="1" />
          <circle cx="18" cy="18" fill="var(--fill-0, #FFF9E5)" id="Ellipse" r="14" />
        </g>
      </svg>
    </div>
  );
}

function Swatch() {
  return (
    <div className="relative shrink-0 size-[36px]" data-name="swatch">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 36 36">
        <g id="swatch">
          <circle cx="18" cy="18" fill="var(--fill-0, #E2F1FF)" id="Ellipse" r="14" />
        </g>
      </svg>
    </div>
  );
}

function Swatch1() {
  return (
    <div className="relative shrink-0 size-[36px]" data-name="swatch">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 36 36">
        <g id="swatch">
          <circle cx="18" cy="18" fill="var(--fill-0, #F59E0B)" id="Ellipse" r="14" />
        </g>
      </svg>
    </div>
  );
}

function Swatch2() {
  return (
    <div className="relative shrink-0 size-[36px]" data-name="swatch">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 36 36">
        <g id="swatch">
          <circle cx="18" cy="18" fill="var(--fill-0, #FB7185)" id="Ellipse" r="14" />
        </g>
      </svg>
    </div>
  );
}

function Swatch3() {
  return (
    <div className="relative shrink-0 size-[36px]" data-name="swatch">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 36 36">
        <g id="swatch">
          <circle cx="18" cy="18" fill="var(--fill-0, #3B82F6)" id="Ellipse" r="14" />
        </g>
      </svg>
    </div>
  );
}

function Swatch4() {
  return (
    <div className="relative shrink-0 size-[36px]" data-name="swatch">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 36 36">
        <g id="swatch">
          <circle cx="18" cy="18" fill="var(--fill-0, #22C55E)" id="Ellipse" r="14" />
        </g>
      </svg>
    </div>
  );
}

function Swatches() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="swatches">
      <SwatchActive />
      <Swatch />
      <Swatch1 />
      <Swatch2 />
      <Swatch3 />
      <Swatch4 />
    </div>
  );
}

function BottomColor() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] h-[100px] items-start pt-[16px] relative shrink-0 w-full" data-name="bottom-color">
      <Swatches />
      <p className="[word-break:break-word] font-['Instrument_Sans:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#f8fafc] text-[13px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Warm White
      </p>
    </div>
  );
}

function LightCardColorExpanded() {
  return (
    <div className="bg-[#161922] content-stretch drop-shadow-[0px_20px_30px_rgba(255,249,229,0.03)] flex flex-col items-start justify-between min-h-[480px] p-[24px] relative rounded-[32px] shrink-0 w-[320px]" data-name="light-card-color-expanded">
      <div aria-hidden className="absolute border border-[#242936] border-solid inset-0 pointer-events-none rounded-[32px]" />
      <Header2 />
      <TopControls2 />
      <BottomColor />
    </div>
  );
}

function Lightbulb3() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lightbulb">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lightbulb">
          <path d={svgPaths.p3b32fe40} id="Vector" stroke="var(--stroke-0, #3B82F6)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Icon3() {
  return (
    <div className="bg-[rgba(59,130,246,0.13)] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[40px]" data-name="icon">
      <Lightbulb3 />
    </div>
  );
}

function Frame5() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Instrument_Sans:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#f8fafc] text-[18px]" style={{ fontVariationSettings: '"wdth" 100' }}>
        Living Room
      </p>
      <p className="font-['Instrument_Sans:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[13px]" style={{ fontVariationSettings: '"wdth" 100' }}>
        Ceiling Lamp
      </p>
    </div>
  );
}

function Title3() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="title">
      <Icon3 />
      <Frame5 />
    </div>
  );
}

function StatusPill3() {
  return (
    <div className="bg-[rgba(59,130,246,0.13)] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[99px] shrink-0" data-name="status-pill">
      <div aria-hidden className="absolute border border-[rgba(59,130,246,0.25)] border-solid inset-0 pointer-events-none rounded-[99px]" />
      <p className="[word-break:break-word] font-['Instrument_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#3b82f6] text-[11px] uppercase whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        ON
      </p>
    </div>
  );
}

function Header3() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="header">
      <Title3 />
      <StatusPill3 />
    </div>
  );
}

function RockerTop3() {
  return (
    <div className="bg-[#3b82f6] content-stretch flex flex-[1_0_0] flex-col items-center justify-center min-h-px relative w-full" data-name="rocker-top">
      <p className="[word-break:break-word] font-['Instrument_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b0c10] text-[12px] uppercase whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        ON
      </p>
    </div>
  );
}

function RockerBottom3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col items-center justify-center min-h-px relative w-full" data-name="rocker-bottom">
      <div aria-hidden className="absolute bg-[#242936] inset-0 pointer-events-none" />
      <p className="[word-break:break-word] font-['Instrument_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#475569] text-[12px] uppercase whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        OFF
      </p>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_-4px_8px_0px_rgba(0,0,0,0.5)]" />
    </div>
  );
}

function RockerFrame3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start min-h-px overflow-clip relative rounded-[18px] w-full" data-name="rocker-frame">
      <RockerTop3 />
      <RockerBottom3 />
    </div>
  );
}

function SwitchContainer3() {
  return (
    <div className="bg-[#0b0c10] content-stretch flex flex-col h-[180px] items-center justify-center p-[8px] relative rounded-[24px] shrink-0 w-[120px]" data-name="switch-container">
      <div aria-hidden className="absolute border-2 border-[#242936] border-solid inset-0 pointer-events-none rounded-[24px]" />
      <RockerFrame3 />
    </div>
  );
}

function TopControls3() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full" data-name="top-controls">
      <SwitchContainer3 />
    </div>
  );
}

function SunDim() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="sun-dim">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_198)" id="sun-dim">
          <path d={svgPaths.p37a9e280} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_198">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function SunBright() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="sun-bright">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="sun-bright">
          <path d={svgPaths.p15137b00} id="Vector" stroke="var(--stroke-0, #3B82F6)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function ValueRow() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="value-row">
      <SunDim />
      <p className="[word-break:break-word] font-['Geist_Mono:SemiBold',sans-serif] font-semibold leading-[0] relative shrink-0 text-[#f8fafc] text-[0px] text-center whitespace-nowrap">
        <span className="leading-[normal] text-[24px]">75</span>
        <span className="leading-[normal] text-[14px]">{` %`}</span>
      </p>
      <SunBright />
    </div>
  );
}

function SliderFill() {
  return <div className="bg-[#3b82f6] h-full relative rounded-[4px] shadow-[0px_0px_12px_0px_#3b82f6] shrink-0 w-[204px]" data-name="slider-fill" />;
}

function SliderTrack() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] h-[12px] relative rounded-[6px] shrink-0 w-full" data-name="slider-track">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center p-[2px] relative size-full">
          <SliderFill />
          <div className="-translate-y-1/2 absolute left-[192px] size-[24px] top-1/2" data-name="slider-handle">
            <div className="absolute inset-[-8.33%_-16.67%_-25%_-16.67%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
                <g filter="url(#filter0_d_1_160)" id="slider-handle">
                  <circle cx="16" cy="14" fill="var(--fill-0, #F8FAFC)" r="12" />
                  <circle cx="16" cy="14" r="11" stroke="var(--stroke-0, #3B82F6)" strokeWidth="2" />
                </g>
                <defs>
                  <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="32" id="filter0_d_1_160" width="32" x="0" y="0">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                    <feOffset dy="2" />
                    <feGaussianBlur stdDeviation="2" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25098 0" />
                    <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_1_160" />
                    <feBlend in="SourceGraphic" in2="effect1_dropShadow_1_160" mode="normal" result="shape" />
                  </filter>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomBrightness() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] h-[100px] items-start pt-[16px] relative shrink-0 w-full" data-name="bottom-brightness">
      <ValueRow />
      <SliderTrack />
    </div>
  );
}

function LightCardBrightnessExpanded() {
  return (
    <div className="bg-[#161922] content-stretch drop-shadow-[0px_20px_30px_rgba(59,130,246,0.03)] flex flex-col items-start justify-between min-h-[480px] p-[24px] relative rounded-[32px] shrink-0 w-[320px]" data-name="light-card-brightness-expanded">
      <div aria-hidden className="absolute border border-[#242936] border-solid inset-0 pointer-events-none rounded-[32px]" />
      <Header3 />
      <TopControls3 />
      <BottomBrightness />
    </div>
  );
}

function AlertTriangle() {
  return (
    <div className="absolute bottom-[8.33%] left-1/4 right-1/4 top-[8.33%]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10 16.668">
        <g clipPath="url(#clip0_1_180)" id="alert-triangle">
          <path d={svgPaths.p1eb93300} id="Vector" stroke="var(--stroke-0, #EF4444)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_180">
            <rect fill="white" height="16.668" width="10" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Warning() {
  return (
    <div className="overflow-clip relative shrink-0 size-[20px]" data-name="warning">
      <AlertTriangle />
    </div>
  );
}

function Icon4() {
  return (
    <div className="bg-[rgba(239,68,68,0.08)] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[40px]" data-name="icon">
      <Warning />
    </div>
  );
}

function Frame6() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Instrument_Sans:Medium',sans-serif] font-medium relative shrink-0 text-[#f8fafc] text-[18px]" style={{ fontVariationSettings: '"wdth" 100' }}>
        Living Room
      </p>
      <p className="font-['Instrument_Sans:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[13px]" style={{ fontVariationSettings: '"wdth" 100' }}>
        Ceiling Lamp
      </p>
      <p className="font-['Instrument_Sans:Bold',sans-serif] font-bold relative shrink-0 text-[#ef4444] text-[11px] uppercase" style={{ fontVariationSettings: '"wdth" 100' }}>
        UNREACHABLE
      </p>
    </div>
  );
}

function Title4() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="title">
      <Icon4 />
      <Frame6 />
    </div>
  );
}

function StatusPill4() {
  return (
    <div className="bg-[rgba(239,68,68,0.08)] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[99px] shrink-0" data-name="status-pill">
      <div aria-hidden className="absolute border border-[rgba(239,68,68,0.2)] border-solid inset-0 pointer-events-none rounded-[99px]" />
      <p className="[word-break:break-word] font-['Instrument_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#ef4444] text-[11px] uppercase whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        ERROR
      </p>
    </div>
  );
}

function Header4() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="header">
      <Title4 />
      <StatusPill4 />
    </div>
  );
}

function RockerTop4() {
  return (
    <div className="bg-[#242936] content-stretch flex flex-[1_0_0] flex-col items-center justify-center min-h-px relative w-full" data-name="rocker-top">
      <p className="[word-break:break-word] font-['Instrument_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#475569] text-[12px] uppercase whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        ON
      </p>
    </div>
  );
}

function RockerBottom4() {
  return (
    <div className="bg-[#242936] content-stretch flex flex-[1_0_0] flex-col items-center justify-center min-h-px relative w-full" data-name="rocker-bottom">
      <p className="[word-break:break-word] font-['Instrument_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#475569] text-[12px] uppercase whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        OFF
      </p>
    </div>
  );
}

function WifiOff() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="wifi-off">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 22">
        <g clipPath="url(#clip0_1_157)" id="wifi-off">
          <path d={svgPaths.p1899b200} id="Vector" stroke="var(--stroke-0, #EF4444)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_157">
            <rect fill="white" height="22" width="22" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function DisconnectionIcon() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute content-stretch flex flex-col items-center justify-center left-1/2 size-[28px] top-1/2" data-name="disconnection-icon">
      <WifiOff />
    </div>
  );
}

function RockerFrame4() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start min-h-px overflow-clip relative rounded-[18px] w-full" data-name="rocker-frame">
      <RockerTop4 />
      <RockerBottom4 />
      <div className="-translate-y-1/2 absolute bg-[rgba(255,255,255,0.08)] h-px left-[12px] opacity-35 right-[12px] top-1/2" data-name="power-off-line" />
      <DisconnectionIcon />
    </div>
  );
}

function SwitchContainer4() {
  return (
    <div className="bg-[#0b0c10] content-stretch flex flex-col h-[180px] items-center justify-center p-[8px] relative rounded-[24px] shrink-0 w-[120px]" data-name="switch-container">
      <div aria-hidden className="absolute border-2 border-[#242936] border-solid inset-0 pointer-events-none rounded-[24px]" />
      <RockerFrame4 />
    </div>
  );
}

function TopControls4() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full" data-name="top-controls">
      <SwitchContainer4 />
    </div>
  );
}

function ErrorMessage() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-['Instrument_Sans:Regular',sans-serif] font-normal gap-[6px] items-start leading-[normal] relative shrink-0 w-full" data-name="error-message">
      <p className="relative shrink-0 text-[#ef4444] text-[13px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Device not responding
      </p>
      <p className="min-w-full relative shrink-0 text-[#475569] text-[12px] w-[min-content]" style={{ fontVariationSettings: '"wdth" 100' }}>
        Check connection and try again.
      </p>
    </div>
  );
}

function RetryButton() {
  return (
    <div className="bg-[#0b0c10] content-stretch flex h-[36px] items-center justify-center px-[14px] relative rounded-[99px] shrink-0" data-name="retry-button">
      <div aria-hidden className="absolute border border-[#ef4444] border-solid inset-0 pointer-events-none rounded-[99px]" />
      <p className="[word-break:break-word] font-['Instrument_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#ef4444] text-[12px] uppercase whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Retry
      </p>
    </div>
  );
}

function BottomError() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] h-[101px] items-start pt-[16px] relative shrink-0 w-full" data-name="bottom-error">
      <ErrorMessage />
      <RetryButton />
    </div>
  );
}

function LightCardError() {
  return (
    <div className="bg-[#161922] content-stretch flex flex-col items-start justify-between min-h-[480px] p-[24px] relative rounded-[32px] shrink-0 w-[320px]" data-name="light-card-error">
      <div aria-hidden className="absolute border border-[#ef4444] border-solid inset-0 pointer-events-none rounded-[32px] shadow-[0px_0px_28px_0px_rgba(239,68,68,0.1),0px_16px_40px_0px_rgba(0,0,0,0.5)]" />
      <Header4 />
      <TopControls4 />
      <BottomError />
    </div>
  );
}

export default function DashboardCanvas() {
  return (
    <div className="bg-[#0b0c10] content-stretch flex gap-[40px] items-center justify-center p-[80px] relative size-full" data-name="dashboard-canvas">
      <LightCardOffUnpowered />
      <LightCardDefault />
      <LightCardColorExpanded />
      <LightCardBrightnessExpanded />
      <LightCardError />
    </div>
  );
}