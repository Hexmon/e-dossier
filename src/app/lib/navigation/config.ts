import { LucideIcon } from "lucide-react";

export type NavItemConfig = {
    key: string;
    label: string;
    url: string;
    icon: string; // String key for Lucide icon lookup on frontend
    badge?: string;
    requiredAction?: string; // RBAC action required to view
    adminBaseline?: boolean; // If true, ADMIN role sees this by default
    specialAction?: string; // For modal triggers etc.
    children?: NavItemConfig[];
};

export type NavSectionConfig = {
    key: string;
    label: string;
    requiredAction?: string;
    collapsible?: boolean;
    items: NavItemConfig[];
};

export const NAVIGATION_TREE: NavSectionConfig[] = [
    {
        key: "dashboard",
        label: "Dashboard",
        items: [
            {
                key: "home",
                label: "Home",
                url: "/dashboard",
                icon: "Home",
            },
        ],
    },
    {
        key: "admin",
        label: "Admin",
        items: [
            {
                key: "admin_mgmt",
                label: "Admin Management",
                url: "/dashboard/genmgmt",
                icon: "Book",
                requiredAction: "page:admin:genmgmt:view",
                adminBaseline: true,
            },
        ],
    },
    {
        key: "settings",
        label: "Settings",
        items: [
            {
                key: "site_settings",
                label: "Device Site Settings",
                url: "/dashboard/settings/device",
                icon: "Settings",
                adminBaseline: true,
            },
        ],
    },
    {
        key: "dossier",
        label: "Dossier",
        items: [
            {
                key: "dossier_mgmt",
                label: "Dossier Management",
                url: "/milmgmt", // Virtual URL, handled by modal
                icon: "NotebookPen",
                specialAction: "OPEN_OC_MODAL",
                requiredAction: "sidebar:dossier",
                adminBaseline: false, // Explicitly false so Admin doesn't auto-see it (User requirement)
            },
        ],
    },
    {
        key: "academics",
        label: "Academics",
        items: [
            {
                key: "manage_marks",
                label: "Academics Management",
                url: "/dashboard/manage-marks",
                icon: "BookOpen",
                requiredAction: "sidebar:academics",
                adminBaseline: true, // Admin sees it
            },
        ],
    },
    {
        key: "reports",
        label: "Report Management",
        items: [
            {
                key: "reports",
                label: "Reports",
                url: "/dashboard/reports",
                icon: "FileText",
                requiredAction: "sidebar:reports",
                adminBaseline: true, // Admin sees it
            },
        ],
    },
];
