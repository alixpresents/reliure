import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  // / → ExplorePage (primary route)
  index("pages/ExplorePageRoute.jsx"),

  // Global pages
  route("explorer", "pages/IndexRedirect.jsx"), // redirect → /
  route("explorer/theme/:tag", "pages/TagPage.jsx"),
  route("citations", "pages/CitationsPage.jsx"),
  route("defis", "pages/ChallengesPage.jsx"),
  route("classement", "pages/ClassementPage.jsx"),
  route("la-revue", "pages/JournalPage.jsx"),
  route("la-revue/:slug", "pages/ArticlePage.jsx"),
  route("selections", "pages/SelectionsPageRoute.jsx"),
  route("selections/:slug", "pages/SelectionPageRoute.jsx"),
  route("livre/:slug", "pages/BookPageRoute.jsx"),
  route("login", "pages/LoginPage.jsx"),

  // Protected pages
  layout("layouts/ProtectedLayout.jsx", [
    route("fil", "pages/FeedPage.jsx"),
    route("parametres", "pages/SettingsPage.jsx"),
    route("backfill", "pages/BackfillPage.jsx"),
  ]),

  // Profile routes — MUST be after all named routes
  // so "explorer" etc. don't match as :username
  route(":username/listes/:slug", "pages/ListPage.jsx"),
  route(":username/badges", "pages/BadgesPage.jsx"),
  route(":username", "pages/ProfilePageRoute.jsx", { id: "profile" }),
  route(":username/:tab", "pages/ProfilePageTabRoute.jsx", { id: "profile-tab" }),

] satisfies RouteConfig;
