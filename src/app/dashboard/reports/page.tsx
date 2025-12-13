"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction, Clock } from "lucide-react";

export default function ComingSoonPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
            <div className="max-w-2xl w-full text-center space-y-8">
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                        <div className="relative bg-card border border-border rounded-full p-8 shadow-lg">
                            <Construction className="h-20 w-20 text-primary animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Heading */}
                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                        Coming Soon
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-md mx-auto">
                        We're working hard to bring you this feature. Check back soon for updates!
                    </p>
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Under Development</span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Button
                        onClick={() => router.back()}
                        variant="default"
                        className="w-full sm:w-auto"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go Back
                    </Button>
                    <Button
                        onClick={() => router.push("/dashboard")}
                        variant="outline"
                        className="w-full sm:w-auto"
                    >
                        Go to Dashboard
                    </Button>
                </div>

                {/* Progress Indicator */}
                <div className="pt-8">
                    <div className="relative max-w-xs mx-auto">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full animate-pulse w-2.5/3"></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">In Progress...</p>
                    </div>
                </div>
            </div>
        </div>
    );
}