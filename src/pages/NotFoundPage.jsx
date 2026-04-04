import { useState } from "react";

export function meta() {
  return [
    { title: "Page introuvable — Reliure" },
    { name: "robots", content: "noindex" },
  ];
}

/* ─── Variant 1 : Chapitre introuvable ─── */
function ChapitreIntrouvable() {
  const chapters = [
    { num: "I.", title: "Le départ", page: "3" },
    { num: "II.", title: "Les rencontres", page: "27" },
    { num: "III.", title: "Le doute", page: "58" },
    { num: "IV.", title: "???", page: "404", missing: true },
    { num: "V.", title: "Le dénouement", page: "131" },
  ];

  return (
    <>
      <div
        className="relative mx-auto mb-8"
        style={{
          maxWidth: 340,
          backgroundColor: "var(--bg-surface)",
          border: "0.5px solid var(--border-default)",
          borderRadius: 12,
          padding: "2rem",
        }}
      >
        {/* Coin arraché */}
        <div
          style={{
            position: "absolute",
            top: "52%",
            right: -6,
            width: 50,
            height: 24,
            backgroundColor: "var(--bg-surface)",
            borderLeft: "2px solid var(--border-default)",
            transform: "rotate(-3deg)",
            opacity: 0.5,
          }}
        />

        <div
          className="font-display"
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-tertiary)",
            textAlign: "center",
            marginBottom: "1.25rem",
          }}
        >
          Table des matières
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {chapters.map((ch) => (
            <div
              key={ch.num}
              className="font-display"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 15,
                lineHeight: 2.4,
                color: "var(--text-secondary)",
                ...(ch.missing
                  ? {
                      textDecoration: "line-through",
                      fontStyle: "italic",
                      opacity: 0.5,
                    }
                  : {}),
              }}
            >
              <span>
                {ch.num} {ch.title}
              </span>
              <span
                style={{
                  color: "var(--text-tertiary)",
                  ...(ch.missing
                    ? { fontStyle: "italic", opacity: 0.4 }
                    : {}),
                }}
              >
                {ch.page}
              </span>
            </div>
          ))}
        </div>
      </div>

      <h1
        className="font-display"
        style={{
          fontSize: 22,
          color: "var(--text-primary)",
          marginBottom: 8,
        }}
      >
        « Ce chapitre a été arraché. »
      </h1>
      <p
        className="font-body"
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}
      >
        La page que tu cherches n'existe pas — ou plus.
        <br />
        Quelqu'un a dû la corner un peu trop fort.
      </p>
    </>
  );
}

/* ─── Variant 2 : La couverture vide ─── */
function CouvertureVide() {
  return (
    <>
      <div
        className="mx-auto mb-8"
        style={{
          width: 150,
          height: 225,
          background: "linear-gradient(135deg, #2a2520, #1a1715)",
          borderRadius: "2px 8px 8px 2px",
          boxShadow:
            "-4px 0 0 #3a3530, -5px 0 0 #2a2520, -6px 1px 4px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          gap: 10,
        }}
      >
        {/* Bord subtil */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "2px 8px 8px 2px",
            pointerEvents: "none",
          }}
        />

        {/* Ligne déco haute */}
        <div
          style={{
            width: 50,
            height: 1,
            backgroundColor: "rgba(255,255,255,0.15)",
          }}
        />

        {/* 404 */}
        <span
          className="font-display"
          style={{
            fontSize: 40,
            color: "rgba(255,255,255,0.85)",
            letterSpacing: 3,
          }}
        >
          404
        </span>

        {/* Ligne déco basse */}
        <div
          style={{
            width: 50,
            height: 1,
            backgroundColor: "rgba(255,255,255,0.15)",
          }}
        />

        {/* Sous-titre */}
        <span
          className="font-display"
          style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}
        >
          Page introuvable
        </span>

        {/* Éditeur */}
        <span
          className="font-display"
          style={{
            fontSize: 8,
            color: "rgba(255,255,255,0.2)",
            position: "absolute",
            bottom: 14,
          }}
        >
          Reliure Éditions
        </span>
      </div>

      <h1
        className="font-display"
        style={{
          fontSize: 20,
          color: "var(--text-primary)",
          marginBottom: 8,
        }}
      >
        « Ce livre n'est pas dans notre catalogue. »
      </h1>
      <p
        className="font-body"
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}
      >
        Tu as ouvert une page qui n'existe pas —
        <br />
        comme un livre fantôme dans une bibliothèque.
      </p>
    </>
  );
}

/* ─── Variant 3 : Page cornée ─── */
function PageCornee() {
  return (
    <>
      <div className="relative mx-auto mb-8" style={{ width: 260 }}>
        {/* Marque-page */}
        <div
          style={{
            position: "absolute",
            top: -8,
            left: 36,
            width: 20,
            height: 65,
            background: "#c45a4a",
            borderRadius: "2px 2px 0 4px",
            opacity: 0.85,
            boxShadow: "1px 1px 3px rgba(0,0,0,0.1)",
            zIndex: 2,
          }}
        >
          {/* Encoche V */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 0,
              height: 0,
              borderStyle: "solid",
              borderWidth: "0 10px 9px 10px",
              borderColor: "transparent transparent var(--bg-primary) transparent",
            }}
          />
        </div>

        {/* Page */}
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "0.5px solid var(--border-default)",
            borderRadius: 6,
            padding: "2.5rem 1.75rem 2rem",
            minHeight: 190,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Coin plié — triangle principal */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 0,
              height: 0,
              borderStyle: "solid",
              borderWidth: "0 34px 34px 0",
              borderColor:
                "transparent var(--bg-primary) transparent transparent",
              zIndex: 1,
            }}
          />
          {/* Ombre du pli */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 34,
              height: 34,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: 0,
                height: 0,
                borderStyle: "solid",
                borderWidth: "34px 0 0 34px",
                borderColor:
                  "transparent transparent transparent var(--border-default)",
                opacity: 0.35,
              }}
            />
          </div>

          <p
            className="font-display italic"
            style={{
              fontSize: 15,
              color: "var(--text-tertiary)",
              lineHeight: 1.7,
              textAlign: "center",
            }}
          >
            « On ne trouve pas toujours ce qu'on cherche, mais on cherche
            toujours ce qu'on veut trouver. »
          </p>
          <span
            className="font-display"
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              opacity: 0.55,
              marginTop: 8,
            }}
          >
            — Auteur introuvable
          </span>

          {/* Numéro de page */}
          <span
            className="font-display"
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              opacity: 0.35,
              position: "absolute",
              bottom: 10,
              right: 14,
            }}
          >
            p. 404
          </span>
        </div>
      </div>

      <h1
        className="font-display"
        style={{
          fontSize: 22,
          color: "var(--text-primary)",
          marginBottom: 8,
        }}
      >
        « Oups, page introuvable. »
      </h1>
      <p
        className="font-body"
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}
      >
        Tu as tourné une page de trop.
        <br />
        Reviens en arrière avant de te perdre pour de bon.
      </p>
    </>
  );
}

/* ─── Variants ─── */
const VARIANTS = [ChapitreIntrouvable, CouvertureVide, PageCornee];

export default function NotFoundPage() {
  const [Variant] = useState(
    () => VARIANTS[Math.floor(Math.random() * VARIANTS.length)]
  );

  return (
    <div
      className="flex items-center justify-center px-4"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      <div className="text-center" style={{ maxWidth: 380, width: "100%" }}>
        <Variant />

        <div
          className="flex justify-center flex-wrap"
          style={{ gap: 12, marginTop: 24 }}
        >
          <a
            href="/"
            className="font-body"
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              backgroundColor: "var(--text-primary)",
              color: "var(--bg-primary)",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Explorer
          </a>
          <a
            href="/"
            className="font-body"
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "0.5px solid var(--border-default)",
              color: "var(--text-primary)",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Rechercher un livre
          </a>
        </div>
      </div>
    </div>
  );
}
