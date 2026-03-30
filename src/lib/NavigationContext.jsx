import { createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";

const NavigationContext = createContext(null);

export function NavigationProvider({ children, openSearchFor }) {
  const navigate = useNavigate();

  const goToBook = (book) => {
    const slug = book.slug || book._supabase?.slug || book.id;
    if (!slug) return;
    navigate(`/livre/${slug}`);
  };

  return (
    <NavigationContext.Provider value={{ goToBook, openSearchFor }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNav() {
  return useContext(NavigationContext);
}
