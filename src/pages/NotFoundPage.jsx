import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="py-20 text-center">
      <div className="text-[15px] text-[#767676] font-body">Page introuvable.</div>
      <Link to="/explorer" className="text-[13px] text-[#666] font-medium font-body mt-3 inline-block hover:text-[#1a1a1a] hover:underline transition-colors duration-150">
        Retour à l'accueil
      </Link>
    </div>
  );
}
