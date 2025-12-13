import { AppSidebar } from "../AppSidebar";
import { SidebarProvider } from "../ui/sidebar";
import { PageHeader } from "./PageHeader";
import Marquee from "../Dashboard/Marquee";

import { marqueeData } from "@/components/Dashboard/MarqueeData";

export default function DashboardLayout({ children, title, description }: { children: React.ReactNode, title: string, description: string }) {
    return (
        <>
            <SidebarProvider>
                <div className="min-h-screen flex w-full bg-background">
                    <aside>
                        <AppSidebar />
                    </aside>

                    <div className="flex-1 flex flex-col w-full overflow-x-hidden">
                        {/* Header */}
                        <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
                            <PageHeader
                                title={title}
                                description={description}
                            />
                        </header>

                        {/* Main Content */}
                        <main className="flex-1 overflow-x-hidden w-full overflow-y-auto">
                            {children}
                        </main>
                    </div>
                </div>
            </SidebarProvider>
        </>
    )
}