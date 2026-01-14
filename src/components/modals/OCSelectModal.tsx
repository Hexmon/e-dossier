"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

import { useDebouncedValue } from "@/app/lib/debounce";
import { fetchOCs, OCListRow } from "@/app/lib/api/ocApi";
import { listAppointments } from "@/app/lib/api/AppointmentFilterApi";

interface OCSelectModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (oc: OCListRow) => void;
    userId?: string;
}

export default function OCSelectModal({
    open,
    onOpenChange,
    onSelect,
    userId,
}: OCSelectModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredOCs, setFilteredOCs] = useState<OCListRow[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [userPlatoonName, setUserPlatoonName] = useState<string | null>(null);
    const [loadingPlatoon, setLoadingPlatoon] = useState(false);

    /** Debounce Logic */
    const debouncedSearch = useDebouncedValue(searchQuery, 400);

    // Fetch user's platoon name when modal opens
    useEffect(() => {
        if (open && userId && !userPlatoonName) {
            const fetchUserPlatoon = async () => {
                setLoadingPlatoon(true);
                try {
                    const { appointments } = await listAppointments({ userId, active: true });

                    const activeAppointment = appointments.find(apt => !apt.endsAt) || appointments[0];

                    if (activeAppointment) {
                        setUserPlatoonName(activeAppointment.platoonName);
                    }
                } catch (err) {
                    console.error("Failed to fetch user appointments:", err);
                } finally {
                    setLoadingPlatoon(false);
                }
            };

            fetchUserPlatoon();
        }
    }, [open, userId, userPlatoonName]);

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            const trimmed = debouncedSearch.trim();

            if (!trimmed) {
                setFilteredOCs([]);
                setIsSearching(false);
                return;
            }

            if (!userPlatoonName) {
                return;
            }

            setIsSearching(true);

            try {
                const items = await fetchOCs<OCListRow>({
                    active: true,
                    q: trimmed,
                    limit: 50,
                });

                // Filter OCs by platoon name
                const filteredByPlatoon = items.filter(
                    (oc) => oc.platoonName === userPlatoonName
                );

                if (!cancelled) setFilteredOCs(filteredByPlatoon);
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
    }, [debouncedSearch, userPlatoonName]);

    const handleSearchChange = (e: any) => {
        setSearchQuery(e.target.value);
        setShowDropdown(true);
    };

    const handleSelectOC = (oc: OCListRow) => {
        onSelect(oc);
        setShowDropdown(false);
        setSearchQuery(`${oc.name} (${oc.ocNo})`);
    };

    // Reset state when modal closes
    useEffect(() => {
        if (!open) {
            setSearchQuery("");
            setFilteredOCs([]);
            setShowDropdown(false);
            setUserPlatoonName(null);
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        <p className="flex justify-center items-center">
                            Please Select an OC before proceeding...
                        </p>
                    </DialogTitle>
                </DialogHeader>

                <div className="relative w-80 mx-auto h-50 overflow-hidden">
                    {loadingPlatoon ? (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                            Loading your platoon information...
                        </div>
                    ) : !userPlatoonName ? (
                        <div className="text-center py-4 text-sm text-destructive">
                            Unable to determine your platoon. Please contact support.
                        </div>
                    ) : (
                        <>
                            <div className="mb-2 text-xs text-muted-foreground text-center">
                                Showing OCs from <span className="font-semibold">{userPlatoonName}</span> platoon
                            </div>

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
                                            No OCs found in your platoon
                                        </li>
                                    )}

                                    {!isSearching &&
                                        filteredOCs.map((oc) => (
                                            <li
                                                key={oc.id}
                                                onMouseDown={() => handleSelectOC(oc)}
                                                className="px-3 py-2 text-sm cursor-pointer hover:bg-[#1677ff] hover:text-white"
                                            >
                                                <div className="font-medium">{oc.name}</div>
                                                <div className="text-xs text-muted-foreground hover:text-white">
                                                    {oc.ocNo} • {oc.platoonName}
                                                </div>
                                            </li>
                                        ))}
                                </ul>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}