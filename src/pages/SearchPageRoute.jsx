export function meta({ location }) {
  const params = new URLSearchParams(location?.search);
  const q = params.get("q") || "";
  return [
    { title: q ? `\u00ab ${q} \u00bb \u2014 Recherche \u00b7 Reliure` : "Recherche \u2014 Reliure" },
    { name: "robots", content: "noindex" },
  ];
}

import SearchPage from "./SearchPage";

export default function SearchPageRoute() {
  return <SearchPage />;
}
