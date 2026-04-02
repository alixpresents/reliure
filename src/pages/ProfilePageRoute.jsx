export function meta({ params }) {
  return [
    { title: `@${params.username} — Reliure` },
    { name: "description", content: `Profil de @${params.username} sur Reliure — critiques, citations et listes de lecture.` },
    { property: "og:title", content: `@${params.username} — Reliure` },
    { property: "og:description", content: `Profil de @${params.username} sur Reliure — critiques, citations et listes de lecture.` },
    { property: "og:type", content: "profile" },
    { property: "og:site_name", content: "Reliure" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

import { useParams, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { usePublicProfile } from "../hooks/usePublicProfile";
import ProfilePage from "./ProfilePage";
import NotFoundPage from "./NotFoundPage";
import Skeleton from "../components/Skeleton";

const TAB_MAP = {
  "": "journal",
  "bibliotheque": "bibliothèque",
  "a-lire": "à lire",
  "critiques": "mes critiques",
  "citations": "mes citations",
  "listes": "mes listes",
  "bilan": "bilan",
};

function ProfileSkeleton() {
  return (
    <div className="py-8">
      {/* Header profil */}
      <div className="flex items-center gap-3.5 mb-3.5">
        <Skeleton.Avatar size={52} />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton.Text width="38%" height={22} />
          <Skeleton.Text width="24%" height={11} />
        </div>
      </div>
      {/* Stats */}
      <div className="flex gap-5 mb-5">
        {[52, 68, 60, 88].map((w, i) => <Skeleton.Text key={i} width={w} height={11} />)}
      </div>
      {/* Bio */}
      <Skeleton.Text width="72%" height={12} className="mb-1.5" />
      <Skeleton.Text width="52%" height={12} className="mb-6" />
      {/* Quatre favoris */}
      <div className="border-t border-border-light py-6">
        <Skeleton.Text width={88} height={10} className="mb-3" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton.Cover key={i} />)}
        </div>
      </div>
      {/* Journal */}
      <div className="border-t border-border-light py-4">
        <Skeleton.Text width={80} height={10} className="mb-3" />
        <div className="flex gap-1.5 flex-wrap">
          {[1, 2, 3, 4, 5].map(i => <Skeleton.Cover key={i} w={80} h={120} />)}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePageRoute() {
  const { username, tab } = useParams();
  const { user } = useAuth();
  const location = useLocation();

  const { profile, loading, notFound } = usePublicProfile(username);

  if (loading) return <ProfileSkeleton />;
  if (notFound || !profile) return <NotFoundPage />;

  const activeTab = TAB_MAP[tab || ""] || "journal";

  return (
    <div className="sk-fade">
      <ProfilePage viewedProfile={profile} initialTab={activeTab} />
    </div>
  );
}
