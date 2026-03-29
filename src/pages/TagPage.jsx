import { useParams, useNavigate } from "react-router-dom";
import Img from "../components/Img";
import Label from "../components/Label";
import { useNav } from "../lib/NavigationContext";
import { useBooksByGenre } from "../hooks/useExplore";

export default function TagPage() {
  const { tag } = useParams();
  const decodedTag = decodeURIComponent(tag || "");
  const navigate = useNavigate();
  const { goToBook: go } = useNav();
  const { books, loading } = useBooksByGenre(decodedTag);

  return (
    <div className="pt-6">
      <button onClick={() => navigate(-1)} className="bg-transparent border-none text-[#737373] cursor-pointer text-[13px] pb-4 font-body">
        ← Retour
      </button>
      <Label>Thème</Label>
      <h2 className="text-[22px] font-normal mb-1 font-display italic">{decodedTag}</h2>

      {loading ? (
        <div className="py-8 text-center text-[13px] text-[#767676] font-body">Chargement...</div>
      ) : books.length > 0 ? (
        <>
          <p className="text-[13px] text-[#737373] mt-1 mb-5 font-body">{books.length} livre{books.length > 1 ? "s" : ""}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {books.map(book => (
              <div key={book.id} className="text-center">
                <Img book={book} w={120} h={180} onClick={() => go(book)} className="w-full h-auto aspect-[2/3]" />
                <div className="text-xs font-medium mt-2 overflow-hidden text-ellipsis whitespace-nowrap font-body">{book.t}</div>
                <div className="text-[11px] text-[#767676] mt-0.5 font-body">{book.a.split(" ").pop()}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="py-12 text-center">
          <div className="text-[15px] text-[#737373] font-body">Aucun livre pour ce thème.</div>
          <div className="text-[13px] text-[#999] font-body mt-2">Les thèmes se rempliront au fil des ajouts.</div>
        </div>
      )}
    </div>
  );
}
