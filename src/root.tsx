import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
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
import OnboardingTooltip from "./components/OnboardingTooltip";
import Toast from "./components/Toast";
import BadgeToast from "./components/BadgeToast";
import { useToast } from "./hooks/useToast";
import { useTheme } from "./hooks/useTheme";
import { useNewBadges } from "./hooks/useNewBadges";
import "./index.css";

const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));

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
    <html lang="fr">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📖</text></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <title>reliure</title>
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
  return <div id="splash">reliure</div>;
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
      const redirect = localStorage.getItem("reliure_redirect_after_login") || "/explorer";
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
  const needsOnboarding = isLoggedIn && !profile && !localStorage.getItem("reliure_onboarding_done");

  if (needsOnboarding) {
    return (
      <div className="min-h-screen font-body" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <Suspense fallback={null}>
          <OnboardingPage onComplete={(uname) => {
            refetch();
            navigate(uname ? `/${uname}` : "/explorer");
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
        <OnboardingTooltip
          onComplete={() => setWalkthroughActive(false)}
          showToast={showToast}
        />
      )}
      {toast.visible && <Toast message={toast.message} />}
      {isLoggedIn && <BadgeToast badge={newBadge} onDismiss={dismissBadge} />}
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
