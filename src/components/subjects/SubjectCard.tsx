"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, BookOpen, Layers } from "lucide-react";
import { Subject } from "@/app/lib/api/subjectsApi";

interface SubjectCardProps {
    subject: Subject;
    onEdit: (subject: Subject) => void;
    onDelete: (id: string) => void;
}

export default function SubjectCard({ subject, onEdit, onDelete }: SubjectCardProps) {
    const {
        id = "",
        code = "",
        name = "",
        branch = "",
        hasTheory = false,
        hasPractical = false,
        defaultTheoryCredits = 0,
        defaultPracticalCredits = 0,
    } = subject;

    const handleEdit = () => onEdit(subject);

    const handleDelete = () => {
        if (id) {
            onDelete(id);
        }
    };

    const getType = () => {
        if (hasTheory && hasPractical) return "Theory + Practical";
        if (hasTheory) return "Theory";
        if (hasPractical) return "Practical";
        return "N/A";
    };

    const totalCredits = defaultTheoryCredits + defaultPracticalCredits;

    return (
        <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div className="space-y-1 flex-1 px-3">
                        <h3 className="font-semibold text-lg leading-tight">{name}</h3>
                        <p className="text-sm text-muted-foreground font-mono">{code}</p>
                    </div>
                    <Badge variant="secondary">{branch}</Badge>
                </div>
            </CardHeader>

            <CardContent className="flex-1">
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <span>Branch: {branch}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span>Type: {getType()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Credits: {totalCredits}</span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="gap-2">
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
    );
}