import { B } from "../data";
import Img from "../components/Img";
import Label from "../components/Label";

export default function TagPage({ tag, go, onBack }) {
  const res = B.filter(b => b.tags?.includes(tag));

  return (
    <div className="pt-6">
      <button onClick={onBack} className="bg-transparent border-none text-[#737373] cursor-pointer text-[13px] pb-4 font-body">
        ← Retour
      </button>
      <Label>Tag</Label>
      <h2 className="text-[22px] font-normal mb-1 font-display italic">{tag}</h2>
      <p className="text-[13px] text-[#737373] mt-1 mb-5 font-body">{res.length} livres</p>
      <div className="grid grid-cols-4 gap-4">
        {res.map(book => (
          <div key={book.id} className="text-center">
            <Img book={book} w={120} h={180} onClick={() => go(book)} className="w-full h-auto aspect-[2/3]" />
            <div className="text-xs font-medium mt-2 overflow-hidden text-ellipsis whitespace-nowrap font-body">{book.t}</div>
            <div className="text-[11px] text-[#767676] mt-0.5 font-body">{book.a.split(" ").pop()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
