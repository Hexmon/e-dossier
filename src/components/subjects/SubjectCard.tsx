"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, BookOpen, Layers } from "lucide-react";
import AddSubjectDialog from "./AddSubjectDialog";

interface SubjectCardProps {
    id?: string;
    trgModel?: string;
    semNo?: string;
    code?: string;
    name?: string;
    subjectType?: string;
    theoryPractical?: string;
    credits?: number;
    onEdit?: (
        id: string,
        updatedSubject: Omit<SubjectCardProps, "onEdit" | "onDelete">
    ) => void;
    onDelete?: (id: string) => void;
}

export default function SubjectCard({
    id = "",
    trgModel,
    semNo,
    code,
    name,
    subjectType,
    theoryPractical,
    credits,
    onEdit,
    onDelete,
}: SubjectCardProps) {
    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleEdit = () => setIsEditOpen(true);

    const handleDelete = () => {
        if (onDelete && id) {
            onDelete(id);
        }
    };

    const handleSave = (updatedSubject: Omit<SubjectCardProps, "onEdit" | "onDelete">) => {
        if (onEdit && id) {
            onEdit(id, updatedSubject);
        }
        setIsEditOpen(false);
    };

    return (
        <>
            <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="">
                    <div className="flex items-start justify-between">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg leading-tight">{name}</h3>
                            <p className="text-sm text-muted-foreground font-mono">{code}</p>
                        </div>
                        <Badge variant="secondary">{subjectType}</Badge>
                    </div>
                </CardHeader>

                <CardContent className="flex-1">
                    <div className=" text-sm">
                        <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            <span>Branch: {subjectType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span>Type: {theoryPractical}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="text-muted-foreground text-sm">Credits: {credits}</span>
                    </div>
                </CardContent>

                <CardFooter className=" gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={handleEdit}
                    >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                        onClick={handleDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>

            {/* Reuse AddSubjectDialog for editing */}
            <AddSubjectDialog
                isOpen={isEditOpen}
                onOpenChange={setIsEditOpen}
                subject={{
                    trgModel: trgModel ?? "",
                    semNo: semNo ?? "",
                    code: code ?? "",
                    name: name ?? "",
                    subjectType: subjectType ?? "Common",
                    theoryPractical: theoryPractical ?? "Theory",
                    credits: credits ?? 0,
                }}
                onAdd={handleSave}
            />
        </>
    );
}
