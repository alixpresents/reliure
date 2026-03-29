import { useParams } from "react-router-dom";
import { useBookBySlug } from "../hooks/useBookBySlug";
import BookPage from "./BookPage";
import NotFoundPage from "./NotFoundPage";

export default function BookPageRoute() {
  const { slug } = useParams();
  const { book, loading, notFound } = useBookBySlug(slug);

  if (loading) {
    return (
      <div className="py-8 text-center text-[13px] text-[#767676] font-body">Chargement...</div>
    );
  }

  if (notFound || !book) return <NotFoundPage />;

  return <BookPage book={book} />;
}
