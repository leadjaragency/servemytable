const items = [
  { text: "Spice Garden · Toronto", isstat: false },
  { text: "34% higher avg. bill", isstat: true },
  { text: "The Golden Bowl · Vancouver", isstat: false },
  { text: "0 allergy incidents", isstat: true },
  { text: "Coconut Grove · Calgary", isstat: false },
  { text: "Setup in < 30 min", isstat: true },
  { text: "Mama Rosa · Montreal", isstat: false },
  { text: "14 languages supported", isstat: true },
  { text: "The Night Owl · Edmonton", isstat: false },
  { text: "No app download needed", isstat: true },
  { text: "Sakura Dining · Ottawa", isstat: false },
  { text: "24/7 AI availability", isstat: true },
  { text: "Bombay Nights · Mississauga", isstat: false },
  { text: "Cedar & Smoke · Winnipeg", isstat: false },
];

export default function LogoMarqueeStrip() {
  return (
    <div className="bg-[#141414] overflow-hidden py-4 border-y border-white/5">
      <div className="flex items-center">
        {/* Static label — pinned left, non-scrolling */}
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[3px] text-white/30 pl-6 pr-5 border-r border-white/10 mr-6 whitespace-nowrap hidden sm:block">
          Trusted across Canada
        </span>

        {/* Scrolling track — items duplicated for seamless loop */}
        <div className="flex-1 overflow-hidden">
          <ul className="marquee-track flex gap-8 w-max">
            {[...items, ...items].map((item, i) => (
              <li key={i} className="shrink-0 flex items-center gap-2">
                {item.isstat ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#C6A34E]/15 text-[#C6A34E] border border-[#C6A34E]/20 whitespace-nowrap">
                    <span className="w-1 h-1 rounded-full bg-[#C6A34E] inline-block" />
                    {item.text}
                  </span>
                ) : (
                  <span className="text-[12px] font-medium text-white/60 whitespace-nowrap">
                    {item.text}
                  </span>
                )}
                <span className="text-white/15 text-xs">·</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
