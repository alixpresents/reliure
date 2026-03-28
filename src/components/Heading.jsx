export default function Heading({ children, right }) {
  return (
    <div className="flex items-baseline justify-between mb-4">
      <h2 className="font-display text-[26px] font-normal m-0 text-[#1a1a1a] italic">{children}</h2>
      {right && <span className="text-[13px] text-[#737373] cursor-pointer font-body">{right}</span>}
    </div>
  );
}
