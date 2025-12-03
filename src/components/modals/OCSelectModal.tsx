"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

import { useDebouncedValue } from "@/app/lib/debounce";
import { fetchOCs, OCListRow } from "@/app/lib/api/ocApi";

interface OCSelectModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (oc: OCListRow) => void;
}

export default function OCSelectModal({
    open,
    onOpenChange,
    onSelect,
}: OCSelectModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredOCs, setFilteredOCs] = useState<OCListRow[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    /** Debounce Logic */
    const debouncedSearch = useDebouncedValue(searchQuery, 400);

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            const trimmed = debouncedSearch.trim();

            if (!trimmed) {
                setFilteredOCs([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);

            try {
                const items = await fetchOCs<OCListRow>({
                    active: true,
                    q: trimmed,
                    limit: 50,
                });

                if (!cancelled) setFilteredOCs(items);
            } catch (err) {
                if (!cancelled) console.error("Failed to fetch OCs:", err);
            } finally {
                if (!cancelled) setIsSearching(false);
            }
        };

        run();

        return () => {
            cancelled = true;
        };
    }, [debouncedSearch]);

    const handleSearchChange = (e: any) => {
        setSearchQuery(e.target.value);
        setShowDropdown(true);
    };

    const handleSelectOC = (oc: OCListRow) => {
        onSelect(oc);
        setShowDropdown(false);
        setSearchQuery(`${oc.name} (${oc.ocNo})`);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle><p className="flex justify-center items-center">Please Select an OC before proceeding...</p></DialogTitle>
                </DialogHeader>

                <div className="relative w-80 mx-auto h-50 overflow-hidden">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />

                        <Input
                            placeholder="Search or select OC..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={() => setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                            className="pl-10 w-full"
                        />
                    </div>

                    {showDropdown && (
                        <ul className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto z-40">
                            {isSearching && (
                                <li className="px-3 py-2 text-xs text-muted-foreground">Searching...</li>
                            )}

                            {!isSearching && filteredOCs.length === 0 && (
                                <li className="px-3 py-2 text-xs text-muted-foreground">
                                    No OCs found
                                </li>
                            )}

                            {!isSearching &&
                                filteredOCs.map((oc) => (
                                    <li
                                        key={oc.id}
                                        onMouseDown={() => handleSelectOC(oc)}
                                        className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                    >
                                        <div className="font-medium">{oc.name}</div>
                                        <div className="text-xs text-muted-foreground">{oc.ocNo}</div>
                                    </li>
                                ))}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
