import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { FONT_URL } from "./data";
import { useAuth } from "./lib/AuthContext";
import { useProfile } from "./hooks/useProfile";
import Header from "./components/Header";
import AnnouncementBanner from "./components/AnnouncementBanner";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import { NavigationProvider } from "./lib/NavigationContext";
import JoinBanner from "./components/JoinBanner";
import OnboardingTooltip from "./components/OnboardingTooltip";
import Toast from "./components/Toast";
import { useToast } from "./hooks/useToast";
import { useTheme } from "./hooks/useTheme";

// Landing page — chargée immédiatement (route par défaut)
import ExplorePage from "./pages/ExplorePage";

// Pages lazy-loadées — chargées à la demande
const BookPageRoute = lazy(() => import("./pages/BookPageRoute"));
const ProfilePageRoute = lazy(() => import("./pages/ProfilePageRoute"));
const FeedPage = lazy(() => import("./pages/FeedPage"));
const CitationsPage = lazy(() => import("./pages/CitationsPage"));
const ListPage = lazy(() => import("./pages/ListPage"));
const TagPage = lazy(() => import("./pages/TagPage"));
const BackfillPage = lazy(() => import("./pages/BackfillPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ChallengesPage = lazy(() => import("./pages/ChallengesPage"));
const JournalPage = lazy(() => import("./pages/JournalPage"));
const ArticlePage = lazy(() => import("./pages/ArticlePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refetch } = useProfile();
  const navigate = useNavigate();
  const [search, setSearch] = useState(false);
  const [searchCb, setSearchCb] = useState(null);
  const [searchInitialQuery, setSearchInitialQuery] = useState("");
  const [walkthroughActive, setWalkthroughActive] = useState(false);
  const { toast, showToast } = useToast();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
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
      // Fallback for books without slug (shouldn't happen for new imports)
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

  // Not logged in — show public pages with header, login for protected
  const isLoggedIn = !!user;
  const needsOnboarding = isLoggedIn && !profile && !localStorage.getItem("reliure_onboarding_done");

  if (needsOnboarding) {
    return (
      <div className="min-h-screen font-body" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <link href={FONT_URL} rel="stylesheet" />
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
      <link href={FONT_URL} rel="stylesheet" />
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
          <Routes>
            <Route path="/" element={<Navigate to="/explorer" replace />} />
            <Route path="/explorer" element={<ExplorePage />} />
            <Route path="/explorer/theme/:tag" element={<TagPage />} />
            <Route path="/citations" element={<CitationsPage />} />
            <Route path="/fil" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
            <Route path="/defis" element={<ChallengesPage />} />
            <Route path="/la-revue" element={<JournalPage />} />
            <Route path="/la-revue/:slug" element={<ArticlePage />} />
            <Route path="/livre/:slug" element={<BookPageRoute />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/parametres" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/backfill" element={<ProtectedRoute><BackfillPage /></ProtectedRoute>} />
            {/* Profile routes — MUST be after all global routes */}
            <Route path="/:username/listes/:slug" element={<ListPage />} />
            <Route path="/:username" element={<ProfilePageRoute />} />
            <Route path="/:username/:tab" element={<ProfilePageRoute />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
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
    </div>
  );
}
