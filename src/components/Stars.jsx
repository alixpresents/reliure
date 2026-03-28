export default function Stars({ r, s = 12 }) {
  return (
    <span className="tracking-wide text-star" style={{ fontSize: s }}>
      {"★".repeat(Math.floor(r))}{r % 1 >= 0.5 ? "½" : ""}
    </span>
  );
}
