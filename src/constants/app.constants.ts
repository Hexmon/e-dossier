import { MenuSection } from "@/types/appSidebar";
import { Activity, Book, BookOpen, CalendarDays, FileText, GraduationCap, Home, Settings, Shield, UserCheck, Users } from "lucide-react";

// src\constants\app.constants.ts
export const POS = {
  COMMANDANT: 'COMMANDANT',
  DCCI: 'DCCI',
  COMMANDER: "COMMANDER",
  DEPUTY_COMMANDANT: 'DEPUTY_COMMANDANT',
  DEPUTY_SECRETARY: 'DEPUTY_SECRETARY',
  HOAT: 'HOAT',
  PLATOON_COMMANDER: 'PLATOON_COMMANDER',
  CCO: 'CCO',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export const SCOPE = {
  GLOBAL: 'GLOBAL',
  PLATOON: 'PLATOON',
} as const;

export type Position = typeof POS[keyof typeof POS];
export type ScopeType = typeof SCOPE[keyof typeof SCOPE];

export const menuItems: MenuSection[] = [
  {
    group: "Dashboard",
    items: [{ title: "Home", url: "/dashboard", icon: Home }],
  },
  {
    group: "Subject Management",
    items: [{ title: "Subjects", url: "/dashboard/subjects", icon: Book }],
  },
  {
    group: "Instructor Management",
    items: [{ title: "Instructors", url: "/dashboard/instructors", icon: GraduationCap }],
  },
  {
    group: "User Management",
    items: [{ title: "Users", url: "/dashboard/users", icon: Shield }],
  },
  {
    group: "Appointment Management",
    items: [{ title: "Appointments", url: "/dashboard/appointments", icon: CalendarDays }],
  },
  {
    group: "Assessment – NSA",
    items: [{ title: "OLQA", url: "/dashboard/olqa", icon: FileText }],
  },
  {
    group: "Overall OC Details",
    items: [{ title: "View All", url: "/dashboard/view-ocs", icon: Users }],
  },
  {
    group: "Academics",
    items: [{ title: "Coming Soon", url: "/dashboard/academics", icon: BookOpen, badge: "Soon" }],
  },
  {
    group: "Physical Training & Sports",
    items: [{ title: "Activities", url: "/dashboard/activities", icon: Activity }],
  },
  {
    group: "Interview",
    collapsible: true,
    items: [
      { title: "Platoon Cdr", url: "/dashboard/interview/platoon-cdr", icon: UserCheck },
      { title: "DS Coord", url: "/dashboard/interview/ds-coord", icon: UserCheck },
      { title: "CDR CTW", url: "/dashboard/interview/cdr-ctw", icon: UserCheck },
      { title: "DCCI", url: "/dashboard/interview/dcci", icon: UserCheck },
      { title: "Comdt", url: "/dashboard/interview/comdt", icon: UserCheck },
    ],
  },
  {
    group: "Report Management",
    items: [{ title: "Reports", url: "/dashboard/reports", icon: FileText }],
  },
  {
    group: "Site Settings",
    items: [{ title: "Configuration", url: "/dashboard/settings", icon: Settings }],
  },
];


export const dossierDetails = [
  { label: "Initiated by", value: "Maj. Kumar, A.K.", editable: true },
  { label: "Opened on", value: "15 Mar 2024", editable: true },
  { label: "Initial Interview", value: "20 Mar 2024", editable: true },
  { label: "Closed by", value: "", editable: true },
  { label: "Closed on", value: "", editable: true },
  { label: "Final Interview", value: "", editable: true },
];

export const USER_ROLES = ["Comdt", "DCCI", "Cdr CTW", "DyCdr CTW", "DS Cord", "HOAT", "Platoon Cdr", "CCO", "User"];