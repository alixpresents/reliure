import { useState, useRef, useCallback } from "react";

export function useToast() {
  const [toast, setToast] = useState({ visible: false, message: "" });
  const timerRef = useRef(null);

  const showToast = useCallback((message) => {
    clearTimeout(timerRef.current);
    setToast({ visible: true, message });
    timerRef.current = setTimeout(() => setToast({ visible: false, message: "" }), 3000);
  }, []);

  return { toast, showToast };
}
