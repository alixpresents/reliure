import { useState } from "react";
import { FONT_URL } from "./data";
import Header from "./components/Header";
import Search from "./components/Search";
import OnboardingPage from "./pages/OnboardingPage";
import ProfilePage from "./pages/ProfilePage";
import FeedPage from "./pages/FeedPage";
import ExplorePage from "./pages/ExplorePage";
import BookPage from "./pages/BookPage";
import JournalPage from "./pages/JournalPage";
import CitationsPage from "./pages/CitationsPage";
import TagPage from "./pages/TagPage";
import BackfillPage from "./pages/BackfillPage";

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [pg, setPg] = useState("explore");
  const [sb, setSb] = useState(null);
  const [st, setSt] = useState(null);
  const [prev, setPrev] = useState("explore");
  const [search, setSearch] = useState(false);

  const go = b => { setPrev(pg); setSb(b); setPg("book"); window.scrollTo(0, 0); };
  const back = () => { setSb(null); setPg(prev); };
  const tag = t => { setPrev(pg); setSt(t); setPg("tag"); };

  return (
    <div className="bg-white min-h-screen text-[#1a1a1a] font-body">
      <link href={FONT_URL} rel="stylesheet" />
      {!isOnboarded ? (
        <OnboardingPage onComplete={() => { setIsOnboarded(true); setPg("explore"); }} />
      ) : (
        <>
          <Header pg={pg} setPg={p => { setPg(p); setSb(null); }} onSearch={() => setSearch(!search)} />
          <Search open={search} onClose={() => setSearch(false)} go={go} />
          <div className="max-w-[760px] mx-auto px-4 sm:px-6 pb-20">
            {pg === "profile" && <ProfilePage go={go} onBackfill={() => { setPrev("profile"); setPg("backfill"); }} onSearch={() => setSearch(true)} />}
            {pg === "backfill" && <BackfillPage onBack={() => setPg("profile")} />}
            {pg === "feed" && <FeedPage go={go} />}
            {pg === "explore" && <ExplorePage go={go} onTag={tag} onSearch={() => setSearch(true)} />}
            {pg === "journal" && <JournalPage go={go} />}
            {pg === "citations" && <CitationsPage go={go} />}
            {pg === "book" && sb && <BookPage book={sb} onBack={back} onTag={tag} go={go} />}
            {pg === "tag" && <TagPage tag={st} go={go} onBack={() => setPg(prev)} />}
          </div>
        </>
      )}
    </div>
  );
}
