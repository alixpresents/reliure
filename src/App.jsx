import { useState } from "react";
import { FONT_URL } from "./data";
import { useAuth } from "./lib/AuthContext";
import { useProfile } from "./hooks/useProfile";
import Header from "./components/Header";
import Search from "./components/Search";
import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import ProfilePage from "./pages/ProfilePage";
import FeedPage from "./pages/FeedPage";
import ExplorePage from "./pages/ExplorePage";
import BookPage from "./pages/BookPage";
import JournalPage from "./pages/JournalPage";
import CitationsPage from "./pages/CitationsPage";
import TagPage from "./pages/TagPage";
import BackfillPage from "./pages/BackfillPage";
import ArticlePage from "./pages/ArticlePage";
import ChallengesPage from "./pages/ChallengesPage";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refetch } = useProfile();
  const [pg, setPg] = useState("explore");
  const [sb, setSb] = useState(null);
  const [sa, setSa] = useState(null);
  const [st, setSt] = useState(null);
  const [prev, setPrev] = useState("explore");
  const [search, setSearch] = useState(false);
  const [searchCb, setSearchCb] = useState(null); // custom callback for Search, or null = navigate

  const scroll0 = () => window.scrollTo(0, 0);
  const go = b => { setPrev(pg); setSb(b); setPg("book"); scroll0(); };
  const openSearchFor = (cb) => { setSearchCb(() => cb); setSearch(true); };
  const closeSearch = () => { setSearch(false); setSearchCb(null); };
  const back = () => { setSb(null); setPg(prev); scroll0(); };
  const tag = t => { setPrev(pg); setSt(t); setPg("tag"); scroll0(); };
  const goArticle = a => { setSa(a); setPg("article"); scroll0(); };
  const backArticle = (nextArticle) => {
    if (nextArticle) { setSa(nextArticle); scroll0(); }
    else { setSa(null); setPg("journal"); scroll0(); }
  };

  // Loading
  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-body">
        <link href={FONT_URL} rel="stylesheet" />
        <span className="text-[17px] font-bold tracking-tight">reliure</span>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="bg-white min-h-screen text-[#1a1a1a] font-body">
        <link href={FONT_URL} rel="stylesheet" />
        <LoginPage />
      </div>
    );
  }

  // Logged in but no profile → onboarding
  if (!profile) {
    return (
      <div className="bg-white min-h-screen text-[#1a1a1a] font-body">
        <link href={FONT_URL} rel="stylesheet" />
        <OnboardingPage onComplete={() => { refetch(); setPg("explore"); }} />
      </div>
    );
  }

  // Initials from profile
  const initials = (profile.display_name || profile.username || "?")
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-white min-h-screen text-[#1a1a1a] font-body">
      <link href={FONT_URL} rel="stylesheet" />
      <Header pg={pg} setPg={p => { setPg(p); setSb(null); scroll0(); }} onSearch={() => { setSearchCb(null); setSearch(!search); }} initials={initials} />
      <Search open={search} onClose={closeSearch} go={searchCb || go} />
      <div className="max-w-[760px] mx-auto px-4 sm:px-6 pb-20">
        <div key={`${pg}-${sb?.id || ""}-${sa?.id || ""}`} className="animate-page-in">
          {pg === "profile" && <ProfilePage go={go} onBackfill={() => { setPrev("profile"); setPg("backfill"); scroll0(); }} onSearch={() => setSearch(true)} onSearchFor={openSearchFor} />}
          {pg === "backfill" && <BackfillPage onBack={() => { setPg("profile"); scroll0(); }} />}
          {pg === "feed" && <FeedPage go={go} />}
          {pg === "explore" && <ExplorePage go={go} onTag={tag} onSearch={() => setSearch(true)} />}
          {pg === "journal" && <JournalPage go={go} goArticle={goArticle} />}
          {pg === "article" && sa && <ArticlePage article={sa} onBack={backArticle} go={go} />}
          {pg === "citations" && <CitationsPage go={go} />}
          {pg === "challenges" && <ChallengesPage />}
          {pg === "book" && sb && <BookPage book={sb} onBack={back} onTag={tag} go={go} />}
          {pg === "tag" && <TagPage tag={st} go={go} onBack={() => setPg(prev)} />}
        </div>
      </div>
    </div>
  );
}
