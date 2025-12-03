import { OCPersonalRecord } from "@/app/lib/api/ocPersonalApi";
import { MenuSection } from "@/types/appSidebar";
import { ClubRow, DrillRow } from "@/types/club-detls";
import { Row as ObstacleRow } from "@/types/obstacleTrg";
import { Row as SpeedRow } from "@/types/speedMarchRunback";
import { Row as sportsRow } from "@/types/sportsAwards";
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
  WING: 'WING',
  SQUADRON: 'SQUADRON',
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

export const dsFieldMap: Record<string, keyof OCPersonalRecord> = {
  "PI Cdr-ss/ic-no": "dsPiSsicNo",
  "PI Cdr-rank": "dsPiRank",
  "PI Cdr-name": "dsPiName",
  "PI Cdr-unit/arm": "dsPiUnitArm",
  "PI Cdr-mobile-no": "dsPiMobile",

  "Dy Cdr-ic-no": "dsDyIcNo",
  "Dy Cdr-rank": "dsDyRank",
  "Dy Cdr-name": "dsDyName",
  "Dy Cdr-unit/arm": "dsDyUnitArm",
  "Dy Cdr-mobile-no": "dsDyMobile",

  "Cdr-ic-no": "dsCdrIcNo",
  "Cdr-rank": "dsCdrRank",
  "Cdr-name": "dsCdrName",
  "Cdr-unit/arm": "dsCdrUnitArm",
  "Cdr-mobile-no": "dsCdrMobile",
};

export const stats = [
  {
    title: "Active OCs",
    value: "246",
    subtitle: "Across 6 platoons",
  },
  {
    title: "Ongoing Assessments",
    value: "12",
    subtitle: "This week",
  },
  {
    title: "Training Completion",
    value: "87%",
    subtitle: "Current batch average",
  },
];

export const defaultClubRows: ClubRow[] = [
  { semester: "I", clubName: "", splAchievement: "", remarks: "" },
  { semester: "II", clubName: "", splAchievement: "", remarks: "" },
  { semester: "III", clubName: "", splAchievement: "", remarks: "" },
  { semester: "IV", clubName: "", splAchievement: "", remarks: "" },
  { semester: "V", clubName: "", splAchievement: "", remarks: "" },
  { semester: "VI", clubName: "", splAchievement: "", remarks: "" },
];

export const defaultDrillRows: DrillRow[] = [
  { semester: "IV", maxMks: 25, m1: "", m2: "", a1c1: "", a2c2: "", remarks: "" },
  { semester: "V", maxMks: 25, m1: "", m2: "", a1c1: "", a2c2: "", remarks: "" },
  { semester: "VI", maxMks: 40, m1: "", m2: "", a1c1: "", a2c2: "", remarks: "" },
  { semester: "Total", maxMks: 90, m1: "", m2: "", a1c1: "", a2c2: "", remarks: "" },
];
export const romanToNumber: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
};

export const terms = ["IV TERM", "V TERM", "VI TERM"];

export const term = ['V TERM', 'VI TERM'];

export const obstaclePrefill: ObstacleRow[] = [
  { obstacle: "EX (15 Mks)", obtained: "", remark: "" },
  { obstacle: "Good (12 Mks)", obtained: "", remark: "" },
  { obstacle: "Sat (09 Mks)", obtained: "", remark: "" },
  { obstacle: "Fail (Nil)", obtained: "", remark: "" },
];

export const tablePrefill: SpeedRow[] = [
  {
    test: "Ex (30 Mks)",
    timing10Label: "1hr 15 mins",
    distance10: "",
    timing20Label: "2hr 40 mins",
    distance20: "",
    timing30Label: "4hr",
    distance30: "",
    marks: "30",
    remark: "",
  },
  {
    test: "Good (21 Mks)",
    timing10Label: "1hr 30 mins",
    distance10: "",
    timing20Label: "2hr 45 mins",
    distance20: "",
    timing30Label: "4hr 7 mins 30 secs",
    distance30: "",
    marks: "21",
    remark: "",
  },
  {
    test: "Sat (12 Mks)",
    timing10Label: "1hr 35 mins",
    distance10: "",
    timing20Label: "2hr 50 mins",
    distance20: "",
    timing30Label: "4hr 10 mins",
    distance30: "",
    marks: "12",
    remark: "",
  },
  {
    test: "Fail (Nil)",
    timing10Label: "Beyond 1hr 35 mins",
    distance10: "",
    timing20Label: "Beyond 2hr 50 mins",
    distance20: "",
    timing30Label: "Beyond 4hr 10 mins",
    distance30: "",
    marks: "Nil",
    remark: "",
  },
  {
    test: "Marks",
    timing10Label: "",
    distance10: "",
    timing20Label: "",
    distance20: "",
    timing30Label: "",
    distance30: "",
    marks: "",
    remark: "",
  },
];

// ─────────────── PREFILL DATA ───────────────
export const springPrefill: sportsRow[] = [
  { activity: "X - Country", string: "", maxMarks: 30, obtained: "" },
  { activity: "Basket Ball", string: "", maxMarks: 15, obtained: "" },
  { activity: "Football", string: "", maxMarks: 15, obtained: "" },
  { activity: "Squash", string: "", maxMarks: 15, obtained: "" },
  { activity: "Wg Team", string: "", maxMarks: 25, obtained: "" },
];

export const autumnPrefill: sportsRow[] = [
  { activity: "X - Country", string: "", maxMarks: 30, obtained: "" },
  { activity: "Hockey", string: "", maxMarks: 15, obtained: "" },
  { activity: "Volley Ball", string: "", maxMarks: 15, obtained: "" },
  { activity: "Tennis", string: "", maxMarks: 15, obtained: "" },
  { activity: "Wg Team", string: "", maxMarks: 25, obtained: "" },
];

export const motivationPrefill: sportsRow[] = [
  { activity: "Merit Card", string: "", maxMarks: "", obtained: "" },
  { activity: "Half Blue", string: "", maxMarks: "", obtained: "" },
  { activity: "Blue", string: "", maxMarks: "", obtained: "" },
  { activity: "Blazer", string: "", maxMarks: "", obtained: "" },
];

export const catOptions = [
  "Sports Awards (Blazer/Blue/H-Blue/Merit)",
  "70%+ in Service Subjects",
  "Academic Torches (G/S/B)",
  "Debate / Public Speaking (Wg/Pl)",
  "Discipline (Negatives)",
  "Misc Activities (Adv, MC, TD, etc.)"
];

export const semestersCfe = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];

export const semestersCounselling = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];
export const warningTypes = ["Relegation", "Withdrawal"];
export const semesters = ["I TERM", "II TERM", "III TERM", "IV TERM", "V TERM", "VI TERM"];
export const termColumns: Record<
  number,
  { timing: keyof SpeedRow; distance: keyof SpeedRow }
> = {
  0: { timing: "timing10Label", distance: "distance10" },
  1: { timing: "timing20Label", distance: "distance20" },
  2: { timing: "timing30Label", distance: "distance30" },
};

export const GRADE_BRACKETS = [
  { key: "outstanding", label: "Outstanding Avg", min: 270, max: 300, rangeLabel: "(300–270)" },
  { key: "well_above", label: "Well Above Avg", min: 240, max: 269, rangeLabel: "(269–240)" },
  { key: "above", label: "Above Avg", min: 210, max: 239, rangeLabel: "(239–210)" },
  { key: "just_above", label: "Just Above Avg", min: 180, max: 209, rangeLabel: "(209–180)" },
  { key: "high_avg", label: "High Avg", min: 150, max: 179, rangeLabel: "(179–150)" },
  { key: "low_avg", label: "Low Avg", min: 120, max: 149, rangeLabel: "(149–120)" },
  { key: "just_below", label: "Just Below Avg", min: 90, max: 119, rangeLabel: "(119–90)" },
  { key: "below", label: "Below Avg", min: 60, max: 89, rangeLabel: "(89–60)" },
  { key: "well_below", label: "Well Below Avg", min: 30, max: 59, rangeLabel: "(59–30)" },
  { key: "poor", label: "Poor", min: 0, max: 29, rangeLabel: "(29–0)" },
];

export const OLQ_GROUPS = {
  "PLG & ORG": [
    "Effective Intelligence",
    "Reasoning Ability",
    "Org Ability",
    "Power of Expression"
  ],
  "Social Adjustment": [
    "Social Adaptability",
    "Cooperation",
    "Sense of Responsibility"
  ],
  "Social Effectiveness": [
    "Initiative",
    "Self-Confidence",
    "Speed of Decision",
    "Ability to Influence the Gp",
    "Liveliness"
  ],
  "Dynamic": [
    "Determination",
    "Courage",
    "Stamina"
  ]
};

// /constants/olq.constants.ts
// Deterministic IDs (slugified). Replace these ids with real UUIDs later if needed.

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/[^\w_]/g, "");
}

export const OLQ_STRUCTURE = {
  "PLG & ORG": [
    { id: slugify("PLG & ORG" + "_" + "Effective Intelligence"), name: "Effective Intelligence" },
    { id: slugify("PLG & ORG" + "_" + "Reasoning Ability"), name: "Reasoning Ability" },
    { id: slugify("PLG & ORG" + "_" + "Org Ability"), name: "Org Ability" },
    { id: slugify("PLG & ORG" + "_" + "Power of Expression"), name: "Power of Expression" },
  ],
  "Social Adjustment": [
    { id: slugify("Social Adjustment" + "_" + "Social Adaptability"), name: "Social Adaptability" },
    { id: slugify("Social Adjustment" + "_" + "Cooperation"), name: "Cooperation" },
    { id: slugify("Social Adjustment" + "_" + "Sense of Responsibility"), name: "Sense of Responsibility" },
  ],
  "Social Effectiveness": [
    { id: slugify("Social Effectiveness" + "_" + "Initiative"), name: "Initiative" },
    { id: slugify("Social Effectiveness" + "_" + "Self-Confidence"), name: "Self-Confidence" },
    { id: slugify("Social Effectiveness" + "_" + "Speed of Decision"), name: "Speed of Decision" },
    { id: slugify("Social Effectiveness" + "_" + "Ability to Influence the Gp"), name: "Ability to Influence the Gp" },
    { id: slugify("Social Effectiveness" + "_" + "Liveliness"), name: "Liveliness" },
  ],
  "Dynamic": [
    { id: slugify("Dynamic" + "_" + "Determination"), name: "Determination" },
    { id: slugify("Dynamic" + "_" + "Courage"), name: "Courage" },
    { id: slugify("Dynamic" + "_" + "Stamina"), name: "Stamina" },
  ],
} as const;

export const OLQ_REMARKS = Object.keys(OLQ_STRUCTURE);

// Camp UUID constants - these should match the training_camps table in the database
// export const CAMP_TYPE_IDENTIFIERS = {
//   "V TERM": "550e8400-e29b-41d4-a716-446655440000", // SEM5 - EX SURAKSHA camp UUID
//   "VI TERM EX VAJRA": "550e8400-e29b-41d4-a716-446655440001", // SEM6A - EX VAJRA camp UUID
//   "VI TERM TECHNO TAC CAMP": "550e8400-e29b-41d4-a716-446655440002", // SEM6A - TECHNO TAC CAMP camp UUID
// }
