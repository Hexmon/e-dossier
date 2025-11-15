import { AppSidebar } from "../AppSidebar";
import { SidebarProvider } from "../ui/sidebar";
import { PageHeader } from "./PageHeader";

export default function DashboardLayout({ children, title, description }: { children: React.ReactNode, title: string, description: string }) {
    return (
        <>
            <SidebarProvider>
                <div className="min-h-screen flex w-full bg-background">
                    <aside>
                        <AppSidebar />
                    </aside>

                    <div className="flex-1 flex flex-col">
                        {/* Header */}
                        <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
                            <PageHeader
                                title={title}
                                description={description}
                            />
                        </header>
                        {children}
                    </div>
                </div>
            </SidebarProvider>
        </>
    )
}
