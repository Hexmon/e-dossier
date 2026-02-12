"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resolveToneClasses, type ColorTone } from "@/lib/theme-color";

interface DashboardCardProps {
    title: string;
    description: string;
    to?: string;
    icon: React.ElementType;
    color: ColorTone;
    className?: string;
    onClick?: () => void;
}

export function DashboardCard({
    title,
    description,
    to,
    icon: Icon,
    color,
    className,
    onClick,
}: DashboardCardProps) {
    const iconTone = resolveToneClasses(color, "icon");
    const buttonTone = resolveToneClasses("primary", "button");

    return (
        <Card
            onClick={onClick}
            className={cn(
                "group hover:shadow-command transition-all duration-300 cursor-pointer rounded-xl shadow-lg",
                className
            )}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", iconTone)}>
                        <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1">
                        <CardTitle className="text-lg transition-colors group-hover:text-primary">
                            {title}
                        </CardTitle>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {description}
                </p>

                {to ? (
                    <Button asChild size="sm" className={cn("w-full cursor-pointer", buttonTone)}>
                        <Link href={to}>Access Module →</Link>
                    </Button>
                ) : (
                    <Button size="sm" className={cn("w-full cursor-pointer", buttonTone)}>
                        Access Module →
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
