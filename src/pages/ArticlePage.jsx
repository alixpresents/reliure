import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { JARTICLES } from "../data";
import Img from "../components/Img";
import Tag from "../components/Tag";
import Label from "../components/Label";
import { useNav } from "../lib/NavigationContext";

export default function ArticlePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { goToBook: go } = useNav();
  const article = JARTICLES.find(a => a.id === slug);
  const others = article ? JARTICLES.filter(a => a.id !== article.id).slice(0, 3) : [];
  const [progress, setProgress] = useState(0);
  const articleRef = useRef(null);

  useEffect(() => {
    if (!article) return;
    const onScroll = () => {
      if (!articleRef.current) return;
      const el = articleRef.current;
      const rect = el.getBoundingClientRect();
      const total = el.scrollHeight - window.innerHeight;
      const scrolled = -rect.top;
      setProgress(Math.min(100, Math.max(0, (scrolled / total) * 100)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [article?.id]);

  if (!article) {
    return (
      <div className="py-16 text-center">
        <p className="text-[15px] font-body" style={{ color: "var(--text-tertiary)" }}>Article introuvable.</p>
      </div>
    );
  }

  // Generate mock paragraphs from the excerpt
  const paragraphs = [
    article.ex,
    article.ex.split(". ").reverse().join(". ") + " La question reste ouverte, et c'est peut-être ce qui fait la force de cette oeuvre.",
    "On pourrait croire que le temps a fait son travail, que les lectures successives ont épuisé le texte. Mais il n'en est rien. Chaque retour au livre révèle une strate nouvelle, un écho inattendu avec le présent.",
    article.ex.split(". ").map(s => s.trim()).filter(Boolean).slice(0, 2).join(". ") + ". C'est cette tension qui traverse l'ensemble du texte et lui confère sa singularité dans le paysage littéraire contemporain.",
  ];

  const firstChar = paragraphs[0][0];
  const restOfFirst = paragraphs[0].slice(1);

  return (
    <div ref={articleRef}>
      {/* Reading progress bar */}
      <div className="sticky top-[52px] z-50 h-[2px] bg-border-light -mx-4 sm:-mx-6">
        <div className="h-full will-change-[width]" style={{ width: `${progress}%`, transition: "width 100ms linear", backgroundColor: "var(--text-primary)" }} />
      </div>
      <button
        onClick={() => navigate("/la-revue")}
        className="bg-transparent border-none cursor-pointer text-[13px] py-4 font-body"
        style={{ color: "var(--text-tertiary)" }}
      >
        ← La Revue
      </button>

      {/* Header */}
      <div className="mb-8">
        <div className="mb-3"><Tag>{article.tag}</Tag></div>
        <h1 className="font-display text-[24px] sm:text-[28px] font-normal leading-tight mb-3">{article.t}</h1>
        {article.st && (
          <p className="text-base leading-relaxed mb-4 font-body" style={{ color: "var(--text-secondary)" }}>{article.st}</p>
        )}
        <div className="text-[13px] font-body" style={{ color: "var(--text-tertiary)" }}>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>{article.a}</span>
          <span className="mx-1.5" style={{ color: "var(--border-subtle)" }}>·</span>
          {article.d}
          <span className="mx-1.5" style={{ color: "var(--border-subtle)" }}>·</span>
          {article.rt} de lecture
        </div>
      </div>

      <div className="border-t border-border-light mb-8" />

      {/* Content + sidebar */}
      <div className="flex flex-col sm:flex-row gap-8">
        {/* Sidebar - above on mobile */}
        <div className="sm:order-2 sm:w-[160px] sm:shrink-0 sm:sticky sm:top-20 sm:self-start flex flex-col items-center sm:items-start">
          <Img book={article.cv} w={160} h={240} onClick={() => go(article.cv)} className="w-[140px] h-[210px] sm:w-[160px] sm:h-[240px]" />
          <div className="text-[13px] font-medium mt-3 font-body text-center sm:text-left">{article.cv.t}</div>
          <div className="text-xs font-body text-center sm:text-left" style={{ color: "var(--text-tertiary)" }}>{article.cv.a}</div>
          <button
            onClick={() => go(article.cv)}
            className="mt-3 w-full px-4 py-[6px] rounded-[14px] text-xs font-medium font-body bg-transparent border-[1.5px] cursor-pointer hover:opacity-80 transition-colors duration-150 text-center"
            style={{ color: "var(--text-tertiary)", borderColor: "var(--border-default)" }}
          >
            Voir la fiche
          </button>
        </div>

        {/* Article body */}
        <div className="flex-1 sm:order-1">
          {/* First paragraph with drop cap */}
          <p className="text-base leading-[1.85] mb-6 font-body" style={{ color: "var(--text-body)" }}>
            <span className="font-display text-[48px] float-left leading-[0.8] mr-2 mt-1" style={{ color: "var(--text-primary)" }}>{firstChar}</span>
            {restOfFirst}
          </p>

          {paragraphs.slice(1).map((p, i) => (
            <p key={i} className="text-base leading-[1.85] mb-6 font-body" style={{ color: "var(--text-body)" }}>{p}</p>
          ))}
        </div>
      </div>

      <div className="border-t border-border-light mt-4 mb-8" />

      {/* À lire aussi */}
      <div className="mb-8">
        <Label>À lire aussi</Label>
        {others.map(a => (
          <div
            key={a.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/la-revue/${a.id}`)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/la-revue/${a.id}`); } }}
            className="flex gap-5 py-5 border-b border-border-light cursor-pointer"
          >
            <div className="flex-1">
              <div className="mb-2"><Tag>{a.tag}</Tag></div>
              <h4 className="text-[15px] sm:text-[17px] font-normal mb-1 leading-[1.3] font-display">{a.t}</h4>
              <div className="text-xs font-body mt-2" style={{ color: "var(--text-tertiary)" }}>
                <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{a.a}</span>
                <span className="mx-1.5" style={{ color: "var(--border-subtle)" }}>·</span>{a.d}
              </div>
            </div>
            <Img book={a.cv} w={64} h={96} />
          </div>
        ))}
      </div>
    </div>
  );
}
