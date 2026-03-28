export default function Avatar({ i, s = 30 }) {
  return (
    <div
      className="rounded-full bg-avatar-bg flex items-center justify-center text-[#6b6b6b] font-medium shrink-0 font-body"
      style={{ width: s, height: s, fontSize: s * 0.35 }}
    >
      {i}
    </div>
  );
}
