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
    readOnly?: boolean;
}

export default function SportsForm({
    termKey,
    isSaving,
    editing,
    onSave,
    onCancel,
    onReset,
    readOnly = false,
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
                    disabled={isSaving || readOnly}
                >
                    {isSaving ? "Saving..." : `Save ${title}`}
                </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSaving || readOnly}
                    >
                        Cancel Edit
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        className="hover:bg-destructive hover:text-primary-foreground"
                        onClick={onReset}
                        disabled={isSaving || readOnly}
                    >
                        Reset
                    </Button>
                </>
            ) : (
                <Button type="button" onClick={onSave} disabled={isSaving || readOnly}>
                    Edit {title} Table
                </Button>
            )}
        </div>
    );
}
