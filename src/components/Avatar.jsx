export default function Avatar({ i, s = 30, src }) {
  return (
    <div
      className="rounded-full bg-avatar-bg flex items-center justify-center text-[#6b6b6b] font-medium shrink-0 font-body overflow-hidden"
      style={{ width: s, height: s, fontSize: s * 0.35 }}
    >
      {src
        ? <img src={src} alt="" className="w-full h-full object-cover" />
        : i
      }
    </div>
  );
}
