export default function Avatar({ i, s = 30, src }) {
  return (
    <div
      className="bg-avatar-bg flex items-center justify-center font-medium shrink-0 font-body"
      style={{ width: s, height: s, fontSize: s * 0.35, borderRadius: "50%", overflow: "hidden", color: "var(--text-secondary)" }}
    >
      {src
        ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
        : i
      }
    </div>
  );
}
