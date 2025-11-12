import { useEffect, useMemo, useRef, useState } from "react";

export function debounce<F extends (...args: any[]) => void>(fn: F, wait = 300) {
    let t: ReturnType<typeof setTimeout> | undefined;
    return (...args: Parameters<F>) => {
        if (t) clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

export function useDebouncedValue<T>(value: T, wait = 300) {
    const [debounced, setDebounced] = useState<T>(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), wait);
        return () => clearTimeout(t);
    }, [value, wait]);
    return debounced;
}

export function useDebouncedCallback<F extends (...args: any[]) => any>(fn: F, wait = 300) {
    const fnRef = useRef(fn);
    fnRef.current = fn;
    return useMemo(() => {
        return debounce((...args: Parameters<F>) => fnRef.current(...args), wait);
    }, [wait]);
}
