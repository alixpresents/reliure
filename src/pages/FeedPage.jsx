import { ACTIVITY } from "../data";
import Img from "../components/Img";
import Stars from "../components/Stars";
import Avatar from "../components/Avatar";
import Heading from "../components/Heading";
import LikeButton from "../components/LikeButton";

export default function FeedPage({ go }) {
  return (
    <div className="pt-5">
      <Heading>Fil d'activité</Heading>
      {ACTIVITY.map(it => (
        <div key={it.id} className="py-[18px] border-b border-border-light">
          <div className="flex items-center gap-2.5 mb-3">
            <Avatar i={it.av} s={30} />
            <div className="flex-1 text-[13px] font-body">
              <span className="font-semibold">{it.u}</span>
              <span className="text-[#737373]">
                {it.ty === "review" ? " a critiqué" : it.ty === "quote" ? " a cité un extrait de" : it.ty === "added" ? " veut lire" : ""}
              </span>
            </div>
            <span className="text-xs text-[#767676] font-body">{it.tm}</span>
          </div>
          <div className="flex gap-3.5 ml-6 sm:ml-10">
            <Img book={it.b} w={80} h={120} onClick={() => go(it.b)} />
            <div className="flex-1">
              <div className="text-[15px] font-medium font-body">{it.b.t}</div>
              <div className="text-xs text-[#737373] font-body">{it.b.a}, {it.b.y}</div>
              {it.r > 0 && <div className="mt-1.5"><Stars r={it.r} s={12} /></div>}
              {it.ty === "quote" && it.txt && (
                <div className="text-[15px] italic text-[#333] leading-[1.7] mt-2.5 border-l-[3px] border-l-cover-fallback pl-3 font-display">
                  « {it.txt} »
                </div>
              )}
              {it.ty === "review" && it.txt && (
                <p className="text-[15px] text-[#333] leading-[1.7] mt-2 font-body">{it.txt}</p>
              )}
              {it.lk > 0 && (
                <div className="flex gap-4 mt-2.5 text-xs text-[#767676] font-body">
                  <LikeButton count={it.lk} />
                  <span className="cursor-pointer">Répondre</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
