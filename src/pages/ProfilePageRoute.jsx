import { createClient } from "@supabase/supabase-js";

async function queryProfileData(supabase, params) {
  const { data: profile } = await supabase
    .from("users")
    .select("id, username, display_name, avatar_url, bio")
    .eq("username", params.username)
    .single();

  if (!profile) throw new Response("Not Found", { status: 404 });

  return { profile };
}

// loader runs at build time during prerendering — own createClient (Node env)
export async function loader({ params }) {
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
  try {
    return await queryProfileData(supabase, params);
  } catch {
    // Profil introuvable ou timeout Supabase — ne pas crasher le build
    return { notFound: true };
  }
}

// clientLoader runs in the browser — uses the singleton to avoid GoTrueClient warning
import { supabase as supabaseSingleton } from "../lib/supabase";

export async function clientLoader({ params }) {
  return queryProfileData(supabaseSingleton, params);
}

export function meta({ data, params }) {
  if (!data?.profile) {
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
  const { profile } = data;
  const name = profile.display_name || profile.username;
  const description = profile.bio || `${name} (@${profile.username}) — critiques, citations et listes de lecture sur Reliure.`;

  return [
    { title: `${name} (@${profile.username}) — Reliure` },
    { name: "description", content: description },
    { property: "og:title", content: `${name} — Reliure` },
    { property: "og:description", content: description },
    { property: "og:image", content: profile.avatar_url || "" },
    { property: "og:type", content: "profile" },
    { property: "og:site_name", content: "Reliure" },
    { name: "twitter:card", content: "summary_large_image" },
    { tagName: "link", rel: "canonical", href: `${import.meta.env.VITE_SITE_URL || "https://reliure.page"}/${profile.username}` },
  ];
}

import { lazy, Suspense } from "react";
import { useLoaderData } from "react-router";
import { useParams, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { usePublicProfile } from "../hooks/usePublicProfile";
import NotFoundPage from "./NotFoundPage";
import Skeleton from "../components/Skeleton";

// Lazy-load ProfilePage to keep browser-only deps out of the SSR bundle
const ProfilePage = lazy(() => import("./ProfilePage"));

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
      <div className="flex items-center gap-3.5 mb-3.5">
        <Skeleton.Avatar size={52} />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton.Text width="38%" height={22} />
          <Skeleton.Text width="24%" height={11} />
        </div>
      </div>
      <div className="flex gap-5 mb-5">
        {[52, 68, 60, 88].map((w, i) => <Skeleton.Text key={i} width={w} height={11} />)}
      </div>
      <Skeleton.Text width="72%" height={12} className="mb-1.5" />
      <Skeleton.Text width="52%" height={12} className="mb-6" />
      <div className="border-t border-border-light py-6">
        <Skeleton.Text width={88} height={10} className="mb-3" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton.Cover key={i} />)}
        </div>
      </div>
      <div className="border-t border-border-light py-4">
        <Skeleton.Text width={80} height={10} className="mb-3" />
        <div className="flex gap-1.5 flex-wrap">
          {[1, 2, 3, 4, 5].map(i => <Skeleton.Cover key={i} w={80} h={120} />)}
        </div>
      </div>
    </div>
  );
}

// SSR-safe content for prerendering
function ProfileSeoContent({ profile }) {
  const name = profile.display_name || profile.username;
  return (
    <article className="py-8">
      <div className="flex items-center gap-3.5 mb-4">
        {profile.avatar_url && (
          <img
            src={profile.avatar_url}
            alt={name}
            style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }}
          />
        )}
        <div>
          <h1 className="text-xl font-display" style={{ color: "var(--text-primary)" }}>{name}</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>@{profile.username}</p>
        </div>
      </div>
      {profile.bio && (
        <p className="text-sm" style={{ color: "var(--text-body)" }}>{profile.bio}</p>
      )}
    </article>
  );
}

export default function ProfilePageRoute() {
  const loaderData = useLoaderData();
  const { username, tab } = useParams();
  const isServer = typeof window === "undefined";

  // Hooks called unconditionally
  const { user } = useAuth();
  const location = useLocation();
  const { profile, loading, notFound } = usePublicProfile(username);

  // SSR: render SEO-safe content
  if (isServer) {
    if (loaderData?.notFound) {
      return (
        <div className="py-16 text-center text-[15px] font-body" style={{ color: "var(--text-tertiary)" }}>
          Profil introuvable.
        </div>
      );
    }
    if (loaderData?.profile) {
      return <ProfileSeoContent profile={loaderData.profile} />;
    }
    return <ProfileSkeleton />;
  }

  // Client: loader data as fallback
  const displayProfile = profile || loaderData?.profile;

  if (!displayProfile && loading) return <ProfileSkeleton />;
  if (notFound || !displayProfile) return <NotFoundPage />;

  const activeTab = TAB_MAP[tab || ""] || "journal";

  return (
    <div className="sk-fade">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfilePage viewedProfile={displayProfile} initialTab={activeTab} />
      </Suspense>
    </div>
  );
}
