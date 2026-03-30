import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { FONT_URL } from "./data";
import { useAuth } from "./lib/AuthContext";
import { useProfile } from "./hooks/useProfile";
import Header from "./components/Header";
import Search from "./components/Search";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import { NavigationProvider } from "./lib/NavigationContext";
import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import ExplorePage from "./pages/ExplorePage";
import FeedPage from "./pages/FeedPage";
import CitationsPage from "./pages/CitationsPage";
import JournalPage from "./pages/JournalPage";
import ArticlePage from "./pages/ArticlePage";
import ChallengesPage from "./pages/ChallengesPage";
import BookPageRoute from "./pages/BookPageRoute";
import ProfilePageRoute from "./pages/ProfilePageRoute";
import ListPage from "./pages/ListPage";
import TagPage from "./pages/TagPage";
import BackfillPage from "./pages/BackfillPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";
import JoinBanner from "./components/JoinBanner";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refetch } = useProfile();
  const navigate = useNavigate();
  const [search, setSearch] = useState(false);
  const [searchCb, setSearchCb] = useState(null);

  const openSearchFor = (cb) => { setSearchCb(() => cb); setSearch(true); };
  const closeSearch = () => { setSearch(false); setSearchCb(null); };

  const goToBook = (book) => {
    const slug = book.slug || book._supabase?.slug;
    if (slug) {
      navigate(`/livre/${slug}`);
    } else {
      // Fallback for books without slug (shouldn't happen for new imports)
      navigate(`/livre/${book.id}`);
    }
  };

  const searchGo = searchCb || goToBook;

  // Loading
  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-body">
        <link href={FONT_URL} rel="stylesheet" />
        <span className="text-[17px] font-bold tracking-tight">reliure</span>
      </div>
    );
  }

  // Not logged in — show public pages with header, login for protected
  const isLoggedIn = !!user;
  const needsOnboarding = isLoggedIn && !profile;

  if (needsOnboarding) {
    return (
      <div className="bg-white min-h-screen text-[#1a1a1a] font-body">
        <link href={FONT_URL} rel="stylesheet" />
        <OnboardingPage onComplete={() => { refetch(); navigate("/explorer"); }} />
      </div>
    );
  }

  const initials = profile
    ? (profile.display_name || profile.username || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="bg-white min-h-screen text-[#1a1a1a] font-body">
      <link href={FONT_URL} rel="stylesheet" />
      <ScrollToTop />
      <Header
        onSearch={() => { setSearchCb(null); setSearch(!search); }}
        initials={initials}
        username={profile?.username}
        avatarUrl={profile?.avatar_url}
        isLoggedIn={isLoggedIn}
      />
      <Search open={search} onClose={closeSearch} go={searchGo} />
      <NavigationProvider openSearchFor={openSearchFor}>
      <div className={`max-w-[760px] mx-auto px-4 sm:px-6 ${isLoggedIn ? "pb-20" : "pb-32"}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/explorer" replace />} />
          <Route path="/explorer" element={<ExplorePage onSearch={() => setSearch(true)} />} />
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
      </div>
      </NavigationProvider>
      {!isLoggedIn && <JoinBanner />}
    </div>
  );
}
