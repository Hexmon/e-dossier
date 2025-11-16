"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle: string;
}

export function StatCard({ title, value, subtitle }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
            </CardHeader>

            <CardContent>
                <div className="text-2xl font-bold text-primary">{value}</div>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
            </CardContent>
        </Card>
    );
}
