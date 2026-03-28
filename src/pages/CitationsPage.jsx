import { QUOTES } from "../data";
import Img from "../components/Img";
import Heading from "../components/Heading";
import LikeButton from "../components/LikeButton";

export default function CitationsPage({ go }) {
  return (
    <div className="pt-6">
      <Heading>Citations</Heading>
      <p className="text-sm text-[#737373] -mt-2 mb-5 font-body">Les plus belles phrases, partagées par la communauté.</p>
      {[...QUOTES].sort((a, b) => b.lk - a.lk).map(q => (
        <div key={q.id} className="py-[22px] border-b border-[#f3f3f3]">
          <div className="text-base italic text-[#1a1a1a] leading-[1.75] border-l-[3px] border-l-cover-fallback pl-[18px] mb-3.5 font-display">
            « {q.txt} »
          </div>
          <div className="flex items-center gap-3">
            <Img book={q.b} w={36} h={52} onClick={() => go(q.b)} />
            <div className="flex-1">
              <div className="text-[13px] font-medium font-body">{q.b.t}</div>
              <div className="text-xs text-[#737373] font-body">{q.b.a}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#737373] font-body">{q.u}</div>
              <div className="text-xs text-[#767676] mt-0.5 font-body"><LikeButton count={q.lk} /></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
