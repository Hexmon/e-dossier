"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface Props {
    termKey: "spring" | "autumn" | "motivation";
    isSaving: boolean;
    editing: boolean;
    onSave: () => void;
    onCancel: () => void;
    onReset: () => void;
}

export default function SportsForm({
    termKey,
    isSaving,
    editing,
    onSave,
    onCancel,
    onReset,
}: Props) {
    const title = termKey[0].toUpperCase() + termKey.slice(1);

    return (
        <div className="flex justify-center gap-3 mt-6">
            {editing ? (
                <>
                    <Button
                        type="button"
                        className="bg-success"
                        onClick={onSave}
                        disabled={isSaving}
                    >
                        {isSaving ? "Saving..." : `Save ${title}`}
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSaving}
                    >
                        Cancel Edit
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        className="hover:bg-destructive hover:text-primary-foreground"
                        onClick={onReset}
                        disabled={isSaving}
                    >
                        Reset
                    </Button>
                </>
            ) : (
                <Button type="button" onClick={onSave} disabled={isSaving}>
                    Edit {title} Table
                </Button>
            )}
        </div>
    );
}
