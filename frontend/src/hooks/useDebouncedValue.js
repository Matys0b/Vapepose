import { useEffect, useState, useRef } from "react";

/** Debounce a fast-changing value (e.g. search input). */
export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  const t = useRef(null);
  useEffect(() => {
    clearTimeout(t.current);
    t.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t.current);
  }, [value, delay]);
  return debounced;
}
