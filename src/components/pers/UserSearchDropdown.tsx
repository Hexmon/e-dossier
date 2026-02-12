"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { searchUsers, type User } from "@/app/lib/api/userApi";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

interface UserSearchDropdownProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    /** Optional scope type filter (e.g. "PLATOON") */
    scopeType?: string;
    debounceMs?: number;
    minChars?: number;
    limit?: number;
}

export default function UserSearchDropdown({
    value,
    onChange,
    disabled = false,
    placeholder = "Search users...",
    scopeType,
    debounceMs = 300,
    minChars = 2,
    limit = 20,
}: UserSearchDropdownProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<User[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const debouncedQuery = useDebounce(query, debounceMs);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync external value changes
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Search on debounced query change
    useEffect(() => {
        if (!debouncedQuery || debouncedQuery.length < minChars) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        let cancelled = false;
        setIsLoading(true);

        searchUsers(debouncedQuery, scopeType, limit)
            .then((users) => {
                if (!cancelled) {
                    setResults(users);
                    setIsOpen(true);
                }
            })
            .catch(() => {
                if (!cancelled) setResults([]);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [debouncedQuery, scopeType, minChars, limit]);

    // Close on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handleSelect = (user: User) => {
        const displayName = user.rank ? `${user.rank} ${user.name}` : user.name;
        setQuery(displayName);
        onChange(displayName);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <Input
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    onChange(e.target.value);
                    if (e.target.value.length >= minChars) setIsOpen(true);
                }}
                onFocus={() => results.length > 0 && setIsOpen(true)}
                disabled={disabled}
                placeholder={placeholder}
            />

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
                    {isLoading ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                            Searching...
                        </div>
                    ) : results.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                            No users found
                        </div>
                    ) : (
                        results.map((user) => (
                            <button
                                key={user.id}
                                type="button"
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors",
                                    "focus:bg-accent focus:text-accent-foreground focus:outline-none"
                                )}
                                onClick={() => handleSelect(user)}
                            >
                                <span className="font-medium">
                                    {user.rank && `${user.rank} `}{user.name}
                                </span>
                                {user.email && (
                                    <span className="text-muted-foreground ml-2">
                                        — {user.email}
                                    </span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
