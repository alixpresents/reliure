import { useParams, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { usePublicProfile } from "../hooks/usePublicProfile";
import ProfilePage from "./ProfilePage";
import NotFoundPage from "./NotFoundPage";

const TAB_MAP = {
  "": "journal",
  "bibliotheque": "bibliothèque",
  "critiques": "mes critiques",
  "citations": "mes citations",
  "listes": "mes listes",
  "bilan": "bilan",
};

export default function ProfilePageRoute() {
  const { username, tab } = useParams();
  const { user } = useAuth();
  const location = useLocation();

  // Determine if viewing own profile
  const isOwnProfile = user && username === user.user_metadata?.username;
  // For own profile, we could skip the fetch — but let's keep it simple
  const { profile, loading, notFound } = usePublicProfile(username);

  if (loading) {
    return (
      <div className="py-8 text-center text-[13px] text-[#767676] font-body">Chargement...</div>
    );
  }

  if (notFound || !profile) return <NotFoundPage />;

  const activeTab = TAB_MAP[tab || ""] || "journal";

  return <ProfilePage viewedProfile={profile} initialTab={activeTab} />;
}
