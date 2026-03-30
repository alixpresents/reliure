import { useState, useEffect, useCallback, useRef } from "react";

const TOTAL_STEPS = 12; // 3 onboarding + 9 walkthrough

const STEPS = [
  {
    key: "favorites",
    selector: '[data-onboarding="favorites"]',
    emoji: "⭐",
    title: "Tes 4 livres de chevet",
    text: "Ces 4 livres, c'est toi. Clique sur un cadre vide pour ajouter ton premier coup de cœur.",
    interactive: true,
    skipLabel: "Je le fais après",
  },
  {
    key: "tab-journal",
    selector: '[data-onboarding="tab-journal"]',
    emoji: "📖",
    title: "Ton journal de lecture",
    text: "Chaque livre que tu termines apparaît ici, rangé par mois. C'est ton histoire de lecteur.",
    clickTarget: true,
    buttonLabel: "Compris →",
  },
  {
    key: "tab-bibliotheque",
    selector: '[data-onboarding="tab-bibliotheque"]',
    emoji: "📚",
    title: "Ta bibliothèque",
    text: "Tous tes livres, en grille, en liste ou en étagère. Tu peux filtrer par statut : lu, en cours, à lire.",
    clickTarget: true,
    buttonLabel: "Compris →",
  },
  {
    key: "tab-critiques",
    selector: '[data-onboarding="tab-critiques"]',
    emoji: "✍️",
    title: "Tes critiques",
    text: "Quand tu écris une critique sur une fiche livre, elle apparaît ici. La communauté peut la liker.",
    clickTarget: true,
    buttonLabel: "Compris →",
  },
  {
    key: "tab-citations",
    selector: '[data-onboarding="tab-citations"]',
    emoji: "💬",
    title: "Tes citations sauvegardées",
    text: "Les phrases que tu as mises de côté. Les meilleures remontent dans la page Citations de la communauté.",
    clickTarget: true,
    buttonLabel: "Compris →",
  },
  {
    key: "tab-listes",
    selector: '[data-onboarding="tab-listes"]',
    emoji: "📝",
    title: "Tes listes",
    text: "Crée des sélections thématiques et partage-les. Les autres utilisateurs peuvent les liker et les suivre.",
    clickTarget: true,
    buttonLabel: "Compris →",
  },
  {
    key: "tab-bilan",
    selector: '[data-onboarding="tab-bilan"]',
    emoji: "📊",
    title: "Ton bilan annuel",
    text: "Pages lues, note moyenne, livres préférés de l'année. Tout s'agrège automatiquement.",
    clickTarget: true,
    buttonLabel: "Compris →",
  },
  {
    key: "search",
    selector: '[data-onboarding="search"]',
    emoji: "🔍",
    title: "Cherche n'importe quel livre",
    text: "Titre, auteur, ISBN. Les livres trouvés s'ajoutent directement à ta bibliothèque.",
    buttonLabel: "Compris →",
  },
  {
    key: "explorer",
    selector: '[data-onboarding="explorer"]',
    emoji: "🧭",
    title: "Découvre la communauté",
    text: "Livres populaires, citations du moment, listes partagées. Un endroit pour trouver ta prochaine lecture.",
    isLast: true,
  },
];

const TOOLTIP_WIDTH = 280;
const PAD = 6;

function getClipPath(rect) {
  if (!rect) return "none";
  const t = rect.top - PAD;
  const l = rect.left - PAD;
  const b = rect.bottom + PAD;
  const r = rect.right + PAD;
  return `polygon(
    0% 0%, 0% 100%,
    ${l}px 100%, ${l}px ${t}px,
    ${r}px ${t}px, ${r}px ${b}px,
    ${l}px ${b}px, ${l}px 100%,
    100% 100%, 100% 0%
  )`;
}

const TOOLTIP_HEIGHT_ESTIMATE = 300;

function getTooltipPosition(rect) {
  if (!rect) return { top: 0, left: 0, arrowLeft: 0, above: false };
  const centerX = rect.left + rect.width / 2;
  const left = Math.max(16, Math.min(centerX - TOOLTIP_WIDTH / 2, window.innerWidth - TOOLTIP_WIDTH - 16));
  const arrowLeft = Math.max(20, Math.min(centerX - left, TOOLTIP_WIDTH - 20));

  const belowTop = rect.bottom + PAD + 12;
  const aboveTop = rect.top - PAD - 12 - TOOLTIP_HEIGHT_ESTIMATE;
  const above = belowTop + TOOLTIP_HEIGHT_ESTIMATE > window.innerHeight || rect.top > window.innerHeight / 2;

  return { top: above ? Math.max(8, aboveTop) : belowTop, left, arrowLeft, above };
}

// Try to find an element, with one retry after 300ms
function findElement(selector, cb) {
  const el = document.querySelector(selector);
  if (el) { cb(el); return; }
  setTimeout(() => {
    const el2 = document.querySelector(selector);
    cb(el2 || null);
  }, 300);
}

export default function OnboardingTooltip({ onComplete, showToast }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const [animating, setAnimating] = useState(false);
  const rafRef = useRef(null);
  const prevStylesRef = useRef(null);
  const autoTimerRef = useRef(null);

  const step = STEPS[stepIndex];
  const globalStep = stepIndex + 4; // steps 1-3 are in OnboardingPage

  // Measure target
  const measureTarget = useCallback(() => {
    const el = document.querySelector(step.selector);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    }
  }, [step.selector]);

  // Initial delay
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(timer);
  }, []);

  // On step change: find element, scroll, click if needed, measure
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    findElement(step.selector, (el) => {
      if (cancelled || !el) {
        // Element not found — skip to next step
        if (!cancelled && stepIndex < STEPS.length - 1) {
          setStepIndex(i => i + 1);
        }
        return;
      }

      // Click target tab programmatically if needed
      if (step.clickTarget) {
        el.click();
      }

      // Scroll into view if needed
      const rect = el.getBoundingClientRect();
      if (rect.top < 60 || rect.bottom > window.innerHeight - 100) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          if (!cancelled) measureTarget();
        }, 500);
      } else {
        measureTarget();
      }
    });

    return () => { cancelled = true; };
  }, [visible, stepIndex, step.selector, step.key, step.clickTarget, measureTarget]);

  // Keep rect updated on scroll/resize
  useEffect(() => {
    if (!visible) return;
    const update = () => {
      rafRef.current = requestAnimationFrame(measureTarget);
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(rafRef.current);
    };
  }, [visible, measureTarget]);

  // Elevate target element above overlay
  useEffect(() => {
    if (!visible) return;
    const el = document.querySelector(step.selector);
    if (!el) return;

    prevStylesRef.current = {
      el,
      position: el.style.position,
      zIndex: el.style.zIndex,
      borderRadius: el.style.borderRadius,
    };

    el.style.position = "relative";
    el.style.zIndex = "201";
    el.style.borderRadius = "6px";

    return () => {
      if (prevStylesRef.current?.el) {
        const prev = prevStylesRef.current;
        prev.el.style.position = prev.position;
        prev.el.style.zIndex = prev.zIndex;
        prev.el.style.borderRadius = prev.borderRadius;
      }
    };
  }, [visible, stepIndex, step.selector]);

  // Listen for favorite-added event (step 4 — favorites), once only
  useEffect(() => {
    if (step.key !== "favorites") return;
    const handler = () => {
      window.removeEventListener("reliure:favorite-added", handler);
      setTimeout(() => advanceStep(), 600);
    };
    window.addEventListener("reliure:favorite-added", handler);
    return () => window.removeEventListener("reliure:favorite-added", handler);
  }, [step.key]);

  // Auto-advance for timed steps
  useEffect(() => {
    if (!step.auto || !visible || !targetRect) return;
    autoTimerRef.current = setTimeout(() => advanceStep(), step.auto);
    return () => clearTimeout(autoTimerRef.current);
  }, [step.auto, visible, targetRect, stepIndex]);

  const advanceStep = () => {
    if (stepIndex >= STEPS.length - 1) {
      finish(true);
      return;
    }
    setAnimating(true);
    setTimeout(() => {
      setStepIndex(i => i + 1);
      setTargetRect(null);
      setAnimating(false);
    }, 150);
  };

  const handleNext = () => {
    if (step.isLast) {
      finish(true);
    } else {
      advanceStep();
    }
  };

  const handleSkip = () => {
    finish(false);
  };

  const finish = (withToast) => {
    localStorage.setItem("reliure_onboarding_done", "true");
    localStorage.removeItem("reliure_walkthrough_pending");
    // Restore any elevated element
    if (prevStylesRef.current?.el) {
      const prev = prevStylesRef.current;
      prev.el.style.position = prev.position;
      prev.el.style.zIndex = prev.zIndex;
      prev.el.style.borderRadius = prev.borderRadius;
    }
    if (withToast) {
      showToast("Tu es prêt·e. Bonne lecture 📖");
    }
    onComplete();
  };

  if (!visible || !targetRect) return null;

  const { top, left, arrowLeft, above } = getTooltipPosition(targetRect);

  return (
    <>
      {/* Overlay with cut-out hole */}
      <div
        className="fixed inset-0 z-[200]"
        style={{
          background: "rgba(0,0,0,0.3)",
          clipPath: getClipPath(targetRect),
          transition: "clip-path 150ms ease",
          pointerEvents: "auto",
        }}
        onClick={e => e.stopPropagation()}
      />

      {/* Click blocker for non-interactive steps */}
      {!step.interactive && (
        <div
          className="fixed inset-0 z-[200]"
          style={{ background: "transparent" }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-[202] border font-body"
        style={{
          backgroundColor: "var(--bg-elevated)",
          borderColor: "var(--border-default)",
          top,
          left,
          width: TOOLTIP_WIDTH,
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
          borderRadius: 10,
          padding: 20,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          opacity: animating ? 0 : 1,
          transform: animating ? "scale(0.95)" : "scale(1)",
          transition: "opacity 150ms ease-out, transform 150ms ease-out",
        }}
      >
        {/* Arrow */}
        {above ? (
          <div
            className="absolute -bottom-[7px] w-[14px] h-[14px] border-r border-b"
            style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)", left: arrowLeft - 7, transform: "rotate(45deg)" }}
          />
        ) : (
          <div
            className="absolute -top-[7px] w-[14px] h-[14px] border-l border-t"
            style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)", left: arrowLeft - 7, transform: "rotate(45deg)" }}
          />
        )}

        {/* Step counter + mini progress */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{globalStep} / {TOTAL_STEPS}</span>
          <div className="flex-1 flex gap-[2px] h-[2px]">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full"
                style={{ background: i < globalStep ? "var(--text-primary)" : "var(--border-subtle)" }}
              />
            ))}
          </div>
        </div>

        {/* Emoji */}
        <div className="text-2xl text-center mb-2">{step.emoji}</div>

        {/* Title */}
        <div className="text-[15px] font-semibold text-center mb-1.5" style={{ color: "var(--text-primary)" }}>
          {step.title}
        </div>

        {/* Body */}
        <div className="text-[13px] text-center leading-[1.6] mb-4" style={{ color: "var(--text-body)" }}>
          {step.text}
        </div>

        {/* Actions */}
        {!step.noActions && (
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-[11px] bg-transparent border-none cursor-pointer hover:opacity-80 transition-colors duration-150"
              style={{ color: "var(--text-tertiary)" }}
            >
              Passer
            </button>

            {step.interactive ? (
              <button
                onClick={handleNext}
                className="text-[11px] bg-transparent border-none cursor-pointer hover:opacity-80 transition-colors duration-150"
                style={{ color: "var(--text-tertiary)" }}
              >
                {step.skipLabel || "Suivant"}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="text-[13px] font-medium px-4 py-2 rounded-lg border-none cursor-pointer hover:opacity-80 transition-colors duration-150"
                style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
              >
                {step.isLast ? "C'est parti ! 🎉" : (step.buttonLabel || "Suivant →")}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
