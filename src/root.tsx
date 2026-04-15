import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse,
} from "react-router";
import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { useProfile } from "./hooks/useProfile";
import Header from "./components/Header";
import AnnouncementBanner from "./components/AnnouncementBanner";
import ScrollToTop from "./components/ScrollToTop";
import { NavigationProvider } from "./lib/NavigationContext";
import JoinBanner from "./components/JoinBanner";
import Toast from "./components/Toast";
import { useToast } from "./hooks/useToast";
import { useTheme } from "./hooks/useTheme";
import { useNewBadges } from "./hooks/useNewBadges";
import { LOADER_QUOTES } from "./constants/loader-quotes";
import "./index.css";

const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const OnboardingTooltip = lazy(() => import("./components/OnboardingTooltip"));
const BadgeToast = lazy(() => import("./components/BadgeToast"));

export function meta() {
  return [
    { title: "Reliure — Le réseau social de lecture francophone" },
    { name: "description", content: "Reliure est une bibliothèque personnelle et un réseau social littéraire pour la communauté francophone. Critiques, citations, listes et journal de lecture." },
    { property: "og:site_name", content: "Reliure" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://surapdwhffynilpwdlkx.supabase.co" />
        <link rel="preconnect" href="https://media.electre-ng-horsprod.com" />
        <link rel="preconnect" href="https://books.google.com" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📖</text></svg>" />
        <link rel="preload" href="/fonts/eb-garamond-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
        <script dangerouslySetInnerHTML={{ __html: `
          if (localStorage.getItem('reliure-theme') === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
          }
        ` }} />
        <style dangerouslySetInnerHTML={{ __html: `
          #splash {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fff;
            font-family: 'EB Garamond', serif;
            font-size: 1.5rem;
            color: #1a1a1a;
            z-index: 9999;
            transition: opacity 0.2s ease;
          }
          [data-theme="dark"] #splash {
            background: #131211;
            color: #e8e5df;
          }
        ` }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  const [randomQuote] = useState(() => LOADER_QUOTES[Math.floor(Math.random() * LOADER_QUOTES.length)]);
  return (
    <div id="splash">
      <div style={{ maxWidth: 480, padding: "0 24px" }}>
        <p className="font-display italic text-center" suppressHydrationWarning>{randomQuote.quote}</p>
        <p className="font-body text-sm text-center" style={{ color: "var(--text-secondary)" }} suppressHydrationWarning>— {randomQuote.author}</p>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg-primary)" }} />}>
        <NotFoundPage />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 font-body"
         style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <h1 className="font-display text-[22px] mb-2">Quelque chose s'est cassé.</h1>
      <p className="text-[14px] mb-6" style={{ color: "var(--text-secondary)" }}>
        Une erreur inattendue est survenue. Réessaie ou reviens à l'accueil.
      </p>
      <a href="/"
         style={{ padding: "10px 24px", borderRadius: "8px", backgroundColor: "var(--text-primary)", color: "var(--bg-primary)", fontSize: "14px", fontWeight: 500, textDecoration: "none" }}>
        Retour à l'accueil
      </a>
    </div>
  );
}

function AppShell() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refetch } = useProfile();
  const navigate = useNavigate();
  const [search, setSearch] = useState(false);
  const [searchCb, setSearchCb] = useState(null);
  const [searchInitialQuery, setSearchInitialQuery] = useState("");
  const [walkthroughActive, setWalkthroughActive] = useState(false);
  const { toast, showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [randomQuote] = useState(() => LOADER_QUOTES[Math.floor(Math.random() * LOADER_QUOTES.length)]);
  const { badge: newBadge, dismiss: dismissBadge } = useNewBadges();

  useEffect(() => {
    console.log('[perf] App mounted at', Math.round(performance.now()), 'ms');
    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 200);
    }
  }, []);

  const openSearchFor = (cb) => { setSearchCb(() => cb); setSearch(true); };
  const closeSearch = () => { setSearch(false); setSearchCb(null); setSearchInitialQuery(""); };

  const goToBook = (book) => {
    const slug = book.slug || book._supabase?.slug;
    if (slug) {
      navigate(`/livre/${slug}`);
    } else {
      navigate(`/livre/${book.id}`);
    }
  };

  // Redirect after sign-in
  useEffect(() => {
    const handler = () => {
      const redirect = localStorage.getItem("reliure_redirect_after_login") || "/";
      localStorage.removeItem("reliure_redirect_after_login");
      navigate(redirect);
    };
    window.addEventListener("reliure:signed-in", handler);
    return () => window.removeEventListener("reliure:signed-in", handler);
  }, [navigate]);

  // Auto-set onboarding_done for existing users (already have a profile)
  useEffect(() => {
    if (authLoading) return;
    if (profile && !localStorage.getItem("reliure_onboarding_done") && !localStorage.getItem("reliure_walkthrough_pending")) {
      localStorage.setItem("reliure_onboarding_done", "true");
    }
  }, [authLoading, profile]);

  // Resume walkthrough after page refresh
  useEffect(() => {
    if (authLoading) return;
    if (profile && localStorage.getItem("reliure_walkthrough_pending") && !localStorage.getItem("reliure_onboarding_done")) {
      setWalkthroughActive(true);
    }
  }, [authLoading, profile]);

  const searchGo = searchCb || goToBook;

  const isLoggedIn = !!user;

  // Loading gate — ne rien décider tant que l'auth et le profil ne sont pas résolus
  if (authLoading || (isLoggedIn && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <div style={{ maxWidth: 480 }}>
          <p className="font-display italic text-center" suppressHydrationWarning>{randomQuote.quote}</p>
          <p className="font-body text-sm text-center" style={{ color: "var(--text-secondary)" }} suppressHydrationWarning>— {randomQuote.author}</p>
        </div>
      </div>
    );
  }

  const needsOnboarding = isLoggedIn && !profileLoading && !profile && typeof window !== "undefined" && !localStorage.getItem("reliure_onboarding_done");

  if (needsOnboarding) {
    return (
      <div className="min-h-screen font-body" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <Suspense fallback={null}>
          <OnboardingPage onComplete={(uname) => {
            refetch();
            navigate(uname ? `/${uname}` : "/");
            setWalkthroughActive(true);
          }} />
        </Suspense>
      </div>
    );
  }

  const initials = profile
    ? (profile.display_name || profile.username || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="min-h-screen font-body" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <ScrollToTop />
      <AnnouncementBanner
        pill="Bêta"
        message="est en bêta fermée —"
        ctaLabel="Demander un accès"
        ctaHref="/login"
        storageKey="reliure_banner_dismissed_v1"
      />
      <Header
        onSearch={() => { setSearchCb(null); setSearch(!search); }}
        onClose={closeSearch}
        searchOpen={search}
        searchGo={searchGo}
        searchInitialQuery={searchInitialQuery}
        initials={initials}
        username={profile?.username}
        avatarUrl={profile?.avatar_url}
        isLoggedIn={isLoggedIn}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <NavigationProvider openSearchFor={openSearchFor}>
      <div className={`max-w-[760px] mx-auto px-4 sm:px-6 ${isLoggedIn ? "pb-20" : "pb-32"}`}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </div>
      </NavigationProvider>
      {!isLoggedIn && <JoinBanner />}
      {walkthroughActive && (
        <Suspense fallback={null}>
          <OnboardingTooltip
            onComplete={() => setWalkthroughActive(false)}
            showToast={showToast}
          />
        </Suspense>
      )}
      {toast.visible && <Toast message={toast.message} />}
      {isLoggedIn && newBadge && (
        <Suspense fallback={null}>
          <BadgeToast badge={newBadge} onDismiss={dismissBadge} />
        </Suspense>
      )}
    </div>
  );
}

export default function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </QueryClientProvider>
  );
}
