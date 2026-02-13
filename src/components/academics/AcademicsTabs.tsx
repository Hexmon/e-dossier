"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import TechSeminarForm from "./TechSeminarForm";
import MiniProjectForm from "./MiniProjectForm";
import { SemesterTableI, SemesterTableII, SemesterTableIII, SemesterTableIV, SemesterTableV_Mech, SemesterTableVI_Mech } from "./SemesterTables";

type SubTab = "mech" | "tech" | "mini" | "single";

interface AcademicsTabsProps {
    ocId: string;
    courseId: string;
    canEdit?: boolean;
}

export default function AcademicsTabs({ ocId, courseId, canEdit = false }: AcademicsTabsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const semesterFromQuery = useMemo(() => {
        const value = Number(searchParams.get("semester") ?? 1);
        if (!Number.isFinite(value)) return 1;
        if (value < 1 || value > 6) return 1;
        return Math.trunc(value);
    }, [searchParams]);

    const [subTab, setSubTab] = useState<Record<number, SubTab>>({
        1: "single",
        2: "single",
        3: "single",
        4: "single",
        5: "mech",
        6: "mech",
    });

    const termLabels: Record<number, string> = {
        1: "I",
        2: "II",
        3: "III",
        4: "IV",
        5: "V",
        6: "VI"
    };

    const selectedTerm = semesterFromQuery;

    useEffect(() => {
        setSubTab({
            1: "single",
            2: "single",
            3: "single",
            4: "single",
            5: "mech",
            6: "mech",
        });
    }, [ocId, courseId]);

    const updateSemesterParam = (term: number) => {
        const params = new URLSearchParams(searchParams.toString());
        const nextValue = String(term);
        if (params.get("semester") === nextValue) {
            return;
        }
        params.set("semester", nextValue);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleTermChange = (term: number) => {
        updateSemesterParam(term);
    };

    return (
        <div>
            <div className="flex justify-center items-center">
                <div className="flex gap-2 mb-4">
                    {Object.entries(termLabels).map(([k, v]) => {
                        const term = Number(k);
                        const label = v;
                        const isActive = selectedTerm === term;

                        return (
                            <button
                                key={term}
                                onClick={() => handleTermChange(term)}
                                className={`px-4 py-2 rounded-t-lg ${isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-foreground"
                                    }`}
                            >
                                {`TERM ${label}`}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="mb-4 flex justify-center items-center">
                {selectedTerm === 5 || selectedTerm === 6 ? (
                    <>
                        <button
                            onClick={() => setSubTab(prev => ({ ...prev, [selectedTerm]: "mech" }))}
                            className={`px-3 py-2 rounded ${subTab[selectedTerm] === "mech"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/70"
                                }`}
                        >
                            Mech Engg / Elect Engg
                        </button>

                        <button
                            onClick={() => setSubTab(prev => ({
                                ...prev,
                                [selectedTerm]: selectedTerm === 5 ? "tech" : "mini"
                            }))}
                            className={`px-3 py-2 rounded ml-2 ${subTab[selectedTerm] === (selectedTerm === 5 ? "tech" : "mini")
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/70"
                                }`}
                        >
                            {selectedTerm === 5 ? "Tech Seminar" : "Mini Project"}
                        </button>
                    </>
                ) : (
                    <div className="h-10"></div>
                )}
            </div>

            <div>
                {selectedTerm === 1 && <SemesterTableI ocId={ocId} courseId={courseId} canEdit={canEdit} />}
                {selectedTerm === 2 && <SemesterTableII ocId={ocId} courseId={courseId} canEdit={canEdit} />}
                {selectedTerm === 3 && <SemesterTableIII ocId={ocId} courseId={courseId} canEdit={canEdit} />}
                {selectedTerm === 4 && <SemesterTableIV ocId={ocId} courseId={courseId} canEdit={canEdit} />}

                {selectedTerm === 5 && subTab[5] === "mech" && <SemesterTableV_Mech ocId={ocId} courseId={courseId} canEdit={canEdit} />}
                {selectedTerm === 5 && subTab[5] === "tech" && <TechSeminarForm ocId={ocId} />}

                {selectedTerm === 6 && subTab[6] === "mech" && <SemesterTableVI_Mech ocId={ocId} courseId={courseId} canEdit={canEdit} />}
                {selectedTerm === 6 && subTab[6] === "mini" && <MiniProjectForm ocId={ocId} />}
            </div>
        </div>
    );
}
