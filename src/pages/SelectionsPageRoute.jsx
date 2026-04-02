export function meta() {
  return [
    { title: "Sélections — Reliure" },
    { name: "description", content: "Sélections de livres curées par la communauté Reliure." },
    { property: "og:title", content: "Sélections — Reliure" },
    { property: "og:description", content: "Sélections de livres curées par la communauté Reliure." },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Reliure" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

import SelectionsPage from "./SelectionsPage";

export default function SelectionsPageRoute() {
  return <SelectionsPage />;
}
