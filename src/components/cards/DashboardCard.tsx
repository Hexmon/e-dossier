"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
    title: string;
    description: string;
    to: string;
    icon: React.ElementType;
    color: string;
    className?: string;
}

export function DashboardCard({
    title,
    description,
    to,
    icon: Icon,
    color,
    className,
}: DashboardCardProps) {
    return (
        <Card
            className={cn(
                "group hover:shadow-command transition-all duration-300 cursor-pointer rounded-xl shadow-lg",
                className
            )}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${color} text-white`}>
                        <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {title}
                        </CardTitle>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {description}
                </p>

                <Button asChild variant="outline" size="sm" className="w-full border border-blue-700">
                    <Link href={to}>Access Module →</Link>
                </Button>
            </CardContent>
        </Card>
    );
}
