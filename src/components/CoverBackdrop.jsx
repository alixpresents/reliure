import { B } from "../data";

export default function CoverBackdrop() {
  const covers = [...B, ...B.slice(0, 4)];
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-4" style={{ width: "max-content" }}>
        {covers.map((b, i) => (
          <img
            key={i}
            src={b.c}
            alt=""
            className="w-[100px] h-[150px] rounded-[3px] object-cover opacity-[0.11] grayscale blur-[1px]"
          />
        ))}
      </div>
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--bg-primary) 40%, transparent), color-mix(in srgb, var(--bg-primary) 90%, transparent), var(--bg-primary))" }}
      />
    </div>
  );
}
