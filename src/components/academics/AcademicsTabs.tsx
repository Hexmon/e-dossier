"use client";

import React, { useState } from "react";
import SemesterTableI from "./SemesterTableI";
import SemesterTableII from "./SemesterTableII";
import SemesterTableIII from "./SemesterTableIII";
import SemesterTableIV from "./SemesterTableIV";
import SemesterV_Mech from "./SemesterV_Mech";
import TechSeminarForm from "./TechSeminarForm";
import SemesterVI_Mech from "./SemesterVI_Mech";
import MiniProjectForm from "./MiniProjectForm";

type SubTab = "mech" | "tech" | "mini" | "single";

export default function AcademicsTabs() {
    const [selectedTerm, setSelectedTerm] = useState<number>(1);
    const [subTab, setSubTab] = useState<Record<number, SubTab>>({
        1: "single",
        2: "single",
        3: "single",
        4: "single",
        5: "mech",
        6: "mech",
    });

    const termLabels: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI" };

    return (
        <div className="max-w-6xl mx-auto p-6 bg-white rounded-xl shadow">
            <div className="mb-4 flex gap-2 justify-center">
                {Object.entries(termLabels).map(([k, v]) => {
                    const term = Number(k);
                    const label = v ?? "";
                    const isActive = selectedTerm === term;
                    return (
                        <button
                            key={term}
                            type="button"
                            onClick={() => setSelectedTerm(term)}
                            className={`px-4 py-2 rounded-t-lg ${isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                        >
                            {`TERM ${label}`}
                        </button>
                    );
                })}
            </div>

            <div className="flex gap-2 justify-center mb-6">
                {selectedTerm === 5 || selectedTerm === 6 ? (
                    <>
                        <button
                            type="button"
                            onClick={() => setSubTab((prev) => ({ ...prev, [selectedTerm]: "mech" }))}
                            className={`px-3 py-2 rounded ${subTab[selectedTerm] === "mech" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                        >
                            Mech Engg / Elect Engg
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setSubTab((prev) => ({ ...prev, [selectedTerm]: selectedTerm === 5 ? "tech" : "mini" }))
                            }
                            className={`px-3 py-2 rounded ${subTab[selectedTerm] === (selectedTerm === 5 ? "tech" : "mini") ? "bg-blue-600 text-white" : "bg-gray-100"
                                }`}
                        >
                            {selectedTerm === 5 ? "Tech Seminar" : "Mini Project"}
                        </button>
                    </>
                ) : (
                    <div></div>
                )}
            </div>

            <div>
                {selectedTerm === 1 && <SemesterTableI />}
                {selectedTerm === 2 && <SemesterTableII />}
                {selectedTerm === 3 && <SemesterTableIII />}
                {selectedTerm === 4 && <SemesterTableIV />}

                {selectedTerm === 5 && subTab[5] === "mech" && <SemesterV_Mech />}
                {selectedTerm === 5 && subTab[5] === "tech" && <TechSeminarForm />}

                {selectedTerm === 6 && subTab[6] === "mech" && <SemesterVI_Mech />}
                {selectedTerm === 6 && subTab[6] === "mini" && <MiniProjectForm />}
            </div>
        </div>
    );
}
