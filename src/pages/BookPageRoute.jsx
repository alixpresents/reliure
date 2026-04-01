import { useParams } from "react-router-dom";
import { useBookBySlug } from "../hooks/useBookBySlug";
import BookPage from "./BookPage";
import NotFoundPage from "./NotFoundPage";
import Skeleton from "../components/Skeleton";

function BookSkeleton() {
  return (
    <div>
      {/* ← Retour */}
      <div className="py-4">
        <Skeleton.Text width={52} height={13} />
      </div>
      {/* Hero : couverture + métadonnées */}
      <div className="flex flex-col sm:flex-row gap-8 py-2 pb-6 items-center sm:items-start">
        <Skeleton.Cover w={180} h={270} />
        <div className="flex-1 pt-1 flex flex-col gap-3">
          <Skeleton.Text width="68%" height={28} />
          <Skeleton.Text width="40%" height={15} />
          <Skeleton.Text width="30%" height={12} />
          {/* Pills statut */}
          <div className="flex gap-1.5 flex-wrap mt-2">
            {[72, 48, 56, 88].map((w, i) => (
              <Skeleton className="rounded-full" key={i} style={{ width: w, height: 30 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookPageRoute() {
  const { slug } = useParams();
  const { book, loading, notFound, refetch } = useBookBySlug(slug);

  if (loading) return <BookSkeleton />;
  if (notFound || !book) return <NotFoundPage />;

  return (
    <div className="sk-fade">
      <BookPage book={book} refetchBook={refetch} />
    </div>
  );
}
