import { Course } from "@/components/courses/CourseCard";
import {
  Medal, Star, Award, ClipboardList, AlertCircle, MessageSquare, Footprints,
  Calendar, BookMarked, Tent, Timer, Mountain, Target, Dumbbell, Phone,
  ShieldAlert, HeartPulse, FileSearch, User, ClipboardCheck, FileText,
  BookOpen, Users, UserCheck, Settings, Shield, HelpCircle,
  LucideIcon,
  Ban,
  Camera,
  Book,
  CheckCircle,
  CalendarDays,
  Trophy,
  FileBadge,
  NotebookPen,
  ChartArea,
  BookOpenCheck,
  ArrowDownUp,
  Gavel,
  Boxes,
  Package,
  ArrowDownCircle
} from "lucide-react";


export const CommandersData = [
  {
    id: 1,
    name: "Brig Atul Jaiswal",
    image: "../assets/commander-placeholder.jpg",
    service: "Indian Army",
    rank: "Commander, CTW",
    tenure: "Present",
    note: "Leading with excellence and dedication to shape future military leaders through innovative training methodologies.",
    achievements: [
      "Modernized MCEME curriculum with advanced engineering technologies",
      "Established international partnerships with 15+ military academies",
      "Led digital transformation initiative across all training programs",
      "Increased graduation rates by 35% through innovative teaching methods",
      "Implemented comprehensive leadership development program"
    ],
    legacy:
      "General Mitchell transformed MCEME into a world-class institution through his visionary leadership and commitment to excellence. His modernization efforts established new standards for military engineering education, while his emphasis on international collaboration expanded the college's global influence. Under his command, MCEME became a beacon of innovation in military education.",
    message:
      "Excellence is not a destination, but a journey of continuous improvement. Every engineer we train carries forward our commitment to serve with honor and distinction."
  },
  {
    id: 2,
    name: "Brig Rajesh Kumar",
    image: "/commander-placeholder.jpg",
    service: "Indian Army",
    rank: "Former Commander, CTW",
    tenure: "2020-2023",
    note: "Instrumental in modernizing training infrastructure and implementing digital learning platforms.",
    achievements: [
      "Modernized MCEME curriculum with advanced engineering technologies",
      "Established international partnerships with 15+ military academies",
      "Led digital transformation initiative across all training programs",
      "Increased graduation rates by 35% through innovative teaching methods",
      "Implemented comprehensive leadership development program"
    ],
    legacy:
      "General Mitchell transformed MCEME into a world-class institution through his visionary leadership and commitment to excellence. His modernization efforts established new standards for military engineering education, while his emphasis on international collaboration expanded the college's global influence. Under his command, MCEME became a beacon of innovation in military education.",
    message:
      "Excellence is not a destination, but a journey of continuous improvement. Every engineer we train carries forward our commitment to serve with honor and distinction."
  },
  {
    id: 3,
    name: "Brig Suresh Sharma",
    image: "/commander-placeholder.jpg",
    service: "Indian Army",
    rank: "Former Commander, CTW",
    tenure: "2017-2020",
    note: "Pioneered advanced field training exercises and inter-service cooperation programs.",
    achievements: [
      "Modernized MCEME curriculum with advanced engineering technologies",
      "Established international partnerships with 15+ military academies",
      "Led digital transformation initiative across all training programs",
      "Increased graduation rates by 35% through innovative teaching methods",
      "Implemented comprehensive leadership development program"
    ],
    legacy:
      "General Mitchell transformed MCEME into a world-class institution through his visionary leadership and commitment to excellence. His modernization efforts established new standards for military engineering education, while his emphasis on international collaboration expanded the college's global influence. Under his command, MCEME became a beacon of innovation in military education.",
    message:
      "Excellence is not a destination, but a journey of continuous improvement. Every engineer we train carries forward our commitment to serve with honor and distinction."
  }
]


export const platoons = [
  {
    id: 1,
    name: "ARJUN",
    tradition: "Embodies precision, strength, and discipline in all training exercises. Known for tactical excellence and unwavering commitment to duty.",
    color: "bg-gradient-to-br from-red-500 to-red-600"
  },
  {
    id: 2,
    name: "CHANDRAGUPT",
    tradition: "Strategic thinking and leadership under pressure. Masters of planning and execution with a focus on innovative solutions.",
    color: "bg-gradient-to-br from-blue-500 to-blue-600"
  },
  {
    id: 3,
    name: "RANAPRATAP",
    tradition: "Courage, resilience, and duty before self. Exemplifies the warrior spirit and protective instincts of true defenders.",
    color: "bg-gradient-to-br from-green-500 to-green-600"
  },
  {
    id: 4,
    name: "SHIVAJI",
    tradition: "Ingenuity, rapid maneuver, and mission focus. Known for quick thinking and adaptive strategies in challenging scenarios.",
    color: "bg-gradient-to-br from-purple-500 to-purple-600"
  },
  {
    id: 5,
    name: "KARNA",
    tradition: "Honor, generosity, and steadfast commitment. Upholds the highest standards of integrity and selfless service.",
    color: "bg-gradient-to-br from-orange-500 to-orange-600"
  },
  {
    id: 6,
    name: "PRITHVIRAJ",
    tradition: "Valor, integrity, and esprit de corps. Fosters unity and brotherhood while maintaining operational excellence.",
    color: "bg-gradient-to-br from-indigo-500 to-indigo-600"
  }
]

export const awards = [
  {
    id: 1,
    name: "Param Vir Chakra",
    description: "India's highest military decoration for acts of most conspicuous bravery in the presence of the enemy.",
    icon: Medal,
    category: "Wartime Gallantry"
  },
  {
    id: 2,
    name: "Maha Vir Chakra",
    description: "Second highest military decoration for acts of conspicuous gallantry in the presence of the enemy.",
    icon: Star,
    category: "Wartime Gallantry"
  },
  {
    id: 3,
    name: "Vir Chakra",
    description: "Third highest wartime gallantry award for acts of bravery in the face of the enemy.",
    icon: Award,
    category: "Wartime Gallantry"
  },
  {
    id: 4,
    name: "Ashok Chakra",
    description: "Highest peacetime military decoration for most conspicuous bravery or daring.",
    icon: Medal,
    category: "Peacetime Gallantry"
  },
  {
    id: 5,
    name: "Kirti Chakra",
    description: "Second highest peacetime gallantry award for conspicuous gallantry.",
    icon: Star,
    category: "Peacetime Gallantry"
  },
  {
    id: 6,
    name: "Shaurya Chakra",
    description: "Third highest peacetime gallantry decoration for gallantry not in the face of the enemy.",
    icon: Award,
    category: "Peacetime Gallantry"
  }
]

export const historydata = [
  { id: 1, year: "1943", event: "Establishment of MCEME as a premier military engineering institution" },
  { id: 2, year: "1947", event: "Post-independence expansion and modernization of training programs" },
  { id: 3, year: "1965", event: "Introduction of specialized electronics and mechanical engineering courses" },
  { id: 4, year: "1980", event: "Formation of the Cadets Training Wing (CTW) structure" },
  { id: 5, year: "2000", event: "Digital transformation and modern training methodologies implementation" },
  { id: 6, year: "2020", event: "Integration of AI and advanced technology in military training" }
]


export const dashboardCards = [
  {
    title: "General Management",
    description: "Oversee overall administration and workflows",
    icon: ClipboardList,
    to: "/dashboard/genmgmt",
    color: "bg-blue-500"
  },
  {
    title: "Dossier",
    description: "Organize, manage, and securely store essential documents and files",
    icon: FileText,
    to: "/dashboard/milmgmt",
    color: "bg-blue-500"
  },

  // {
  //   title: "User Management",
  //   description: "Handle user accounts and permissions",
  //   icon: Users,
  //   to: "/dashboard/users",
  //   color: "bg-red-500"
  // },
  {
    title: "Site Settings",
    description: "Update system preferences and configurations",
    icon: Settings,
    to: "/dashboard/settings",
    color: "bg-gray-500"
  },
  {
    title: "Appointment Management",
    description: "Assign and manage official appointments and roles",
    icon: Users,
    to: "/dashboard/appointments",
    color: "bg-indigo-500"
  },
  {
    title: "Help / How-To",
    description: "Guides, FAQs, and support resources",
    icon: HelpCircle,
    to: "/dashboard/help",
    color: "bg-teal-500"
  }
];


export const managementCard = [
  {
    title: "OC Management",
    description: "Manage Officer Cadets and their records",
    icon: UserCheck,
    to: "/dashboard/genmgmt/ocmgmt",
    color: "bg-orange-500 "
  },
  {
    title: "Course Management",
    description: "Create, update, and track training courses",
    icon: BookOpen,
    to: "/dashboard/genmgmt/coursemgmt",
    color: "bg-purple-500"
  },
  {
    title: "Subject Management",
    description: "Organize and maintain subjects within courses",
    icon: BookOpen,
    to: "/dashboard/genmgmt/subjectmgmt",
    color: "bg-blue-500"
  },
  {
    title: "User Management",
    description: "Manage user roles, permissions, and profiles",
    icon: Users,
    to: "/dashboard/genmgmt/usersmgmt",
    color: "bg-red-500"
  },
  {
    title: "Approval Management",
    description: "Handle user approvals and verification processes",
    icon: CheckCircle,
    to: "/dashboard/genmgmt/approvalmgmt",
    color: "bg-green-500"
  },
  {
    title: "Appointment Management",
    description: "Schedule, track, and manage appointments efficiently",
    icon: CalendarDays,
    to: "/dashboard/genmgmt/appointmentmgmt",
    color: "bg-blue-500"
  },
  {
    title: "RBAC Management",
    description: "Manage permissions, mappings, and field-level rules",
    icon: Shield,
    to: "/dashboard/genmgmt/rbac",
    color: "bg-indigo-600"
  },
  {
    title: "Instructor Management",
    description: "Manage instructors, roles, and assignments efficiently",
    icon: UserCheck,
    to: "/dashboard/genmgmt/instructors",
    color: "bg-green-500"
  },
  {
    title: "Offerings Management",
    description: "Create, update, and manage course offerings efficiently",
    icon: BookOpenCheck,
    to: "/dashboard/genmgmt/offerings",
    color: "bg-purple-500"
  },
  // {
  //   title: "Relegation Management",
  //   description: "Monitor, evaluate, and manage student relegation and promotion status",
  //   icon: ArrowDownUp,
  //   to: "/dashboard/genmgmt/relegation",
  //   color: "bg-red-500"
  // },
  {
    title: "Platoon Management",
    description: "Create, organize, and manage platoons and assigned personnel efficiently",
    icon: Users,
    to: "/dashboard/genmgmt/platoon-management",
    color: "bg-green-500"
  },
  // {
  //   title: "Discipline Management",
  //   description: "Manage and track discipline records",
  //   icon: ShieldAlert,
  //   to: "/dashboard/genmgmt/discipline-records",
  //   color: "bg-blue-500"
  // },
  // {
  //   title: "Camps Management",
  //   description: "Create and Manage Camps efficiently",
  //   icon: Tent,
  //   to: "/dashboard/genmgmt/camps",
  //   color: "bg-green-700"
  // },
  // {
  //   title: "Punishment Management",
  //   description: "Track, assign, and manage disciplinary punishments",
  //   icon: Gavel,
  //   to: "/dashboard/genmgmt/punishments",
  //   color: "bg-red-700"
  // },
  // {
  //   title: "Interview Management",
  //   description: "Schedule, track, and manage interviews",
  //   icon: Users,
  //   to: "/dashboard/genmgmt/interviews-mgmt",
  //   color: "bg-blue-700"
  // },
  // {
  //   title: "Physical Training Management",
  //   description: "Plan, schedule, and track physical training sessions",
  //   icon: Dumbbell,
  //   to: "/dashboard/genmgmt/pt-mgmt",
  //   color: "bg-green-700"
  // }


  // {
  //   title: "Settings Management",
  //   description: "Configure application preferences and settings",
  //   icon: Settings,
  //   to: "/dashboard/genmgmt",
  //   color: "bg-gray-500"
  // }

];

export const moduleManagementCard = [
  {
    title: "Relegation Management",
    description: "Monitor, evaluate, and manage student relegation and promotion status",
    icon: ArrowDownUp,
    to: "/dashboard/genmgmt/relegation",
    color: "bg-red-500"
  },
  {
    title: "Camps Management",
    description: "Create and Manage Camps efficiently",
    icon: Tent,
    to: "/dashboard/genmgmt/camps",
    color: "bg-green-700"
  },
  {
    title: "Punishment Management",
    description: "Track, assign, and manage disciplinary punishments",
    icon: Gavel,
    to: "/dashboard/genmgmt/punishments",
    color: "bg-red-700"
  },
  {
    title: "Interview Management",
    description: "Schedule, track, and manage interviews",
    icon: Users,
    to: "/dashboard/genmgmt/interviews-mgmt",
    color: "bg-blue-700"
  },
  {
    title: "Physical Training Management",
    description: "Plan, schedule, and track physical training sessions",
    icon: Dumbbell,
    to: "/dashboard/genmgmt/pt-mgmt",
    color: "bg-green-700"
  }


  // {
  //   title: "Settings Management",
  //   description: "Configure application preferences and settings",
  //   icon: Settings,
  //   to: "/dashboard/genmgmt",
  //   color: "bg-gray-500"
  // }

];

type TrainingCard = {
  title: string;
  description: string;
  icon: LucideIcon;
  to: ((id: string) => string);
  color: string;
};

export const militaryTrainingCards: TrainingCard[] = [
  {
    title: "Performance Graph",
    description: "Visual performance tracking and analytics",
    icon: ChartArea,
    to: (id: string) => `/dashboard/${id}/milmgmt/performance-graph`,
    color: "bg-blue-700"
  },
  {
    title: "Dossier Snapshot",
    description: "Quickly view and analyze OC details",
    icon: Camera,
    to: (id: string) => `/dashboard/${id}/milmgmt/dossier-snapshot`,
    color: "bg-blue-600"
  },
  {
    title: "Dossier Filling",
    description: "Maintain detailed dossier filling records",
    icon: FileText,
    to: (id: string) => `/dashboard/${id}/milmgmt/dossier-filling`,
    color: "bg-green-600"
  },
  {
    title: "Dossier Inspection",
    description: "Track and review dossier inspection sheets",
    icon: ClipboardCheck,
    to: (id: string) => `/dashboard/${id}/milmgmt/dossier-insp`,
    color: "bg-blue-600"
  },
  {
    title: "Personal Particulars",
    description: "Record and manage cadet personal particulars",
    icon: User,
    to: (id: string) => `/dashboard/${id}/milmgmt/pers-particulars`,
    color: "bg-indigo-600"
  },
  {
    title: "Background Details",
    description: "Capture cadet family and background information",
    icon: FileSearch,
    to: (id: string) => `/dashboard/${id}/milmgmt/background-detls`,
    color: "bg-cyan-600"
  },
  {
    title: "SSB Reports",
    description: "Capture cadet reports information",
    icon: FileText,
    to: (id: string) => `/dashboard/${id}/milmgmt/ssb-reports`,
    color: "bg-cyan-600",
  },
  {
    title: "Medical Records",
    description: "Manage cadet health and medical documentation",
    icon: HeartPulse,
    to: (id: string) => `/dashboard/${id}/milmgmt/med-record`,
    color: "bg-red-600"
  },
  {
    title: "Discipline Records",
    description: "Log disciplinary actions and observations",
    icon: ShieldAlert,
    to: (id: string) => `/dashboard/${id}/milmgmt/discip-records`,
    color: "bg-yellow-600"
  },
  {
    title: "Parent Communication",
    description: "Record communication with parents and guardians",
    icon: Phone,
    to: (id: string) => `/dashboard/${id}/milmgmt/comn-parents`,
    color: "bg-teal-600"
  },
  {
    title: "Sports & Motivation Awards",
    description: "Manage cadet sports achievements and motivation awards",
    icon: Trophy,
    to: (id: string) => `/dashboard/${id}/milmgmt/sports-awards`,
    color: "bg-yellow-600"
  },
  {
    title: "Weapon Training",
    description: "Record weapon training performance",
    icon: Target,
    to: (id: string) => `/dashboard/${id}/milmgmt/wpn-trg`,
    color: "bg-gray-700"
  },
  {
    title: "Obstacle Training",
    description: "Maintain obstacle course training records",
    icon: Mountain,
    to: (id: string) => `/dashboard/${id}/milmgmt/obstacle-trg`,
    color: "bg-pink-600"
  },
  {
    title: "Speed March / Runs",
    description: "Track cadet march and run-back timings",
    icon: Timer,
    to: (id: string) => `/dashboard/${id}/milmgmt/speed-march`,
    color: "bg-purple-600"
  },
  {
    title: "Camps",
    description: "Maintain participation and performance in camps",
    icon: Tent,
    to: (id: string) => `/dashboard/${id}/milmgmt/camps`,
    color: "bg-green-700"
  },
  {
    title: "Club Details",
    description: "Record cadet participation in clubs and activities",
    icon: BookMarked,
    to: (id: string) => `/dashboard/${id}/milmgmt/club-detls`,
    color: "bg-blue-700"
  },
  {
    title: "Leave Records",
    description: "Manage and track cadet leave history",
    icon: Calendar,
    to: (id: string) => `/dashboard/${id}/milmgmt/leave-record`,
    color: "bg-indigo-700"
  },
  {
    title: "Hikes",
    description: "Track participation and performance in hikes",
    icon: Footprints,
    to: (id: string) => `/dashboard/${id}/milmgmt/hikes`,
    color: "bg-emerald-600"
  },
  {
    title: "Detention",
    description: "Record and manage detention instances",
    icon: Ban,
    to: (id: string) => `/dashboard/${id}/milmgmt/detention`,
    color: "bg-red-700"
  },
  {
    title: "Counselling",
    description: "Document cadet counselling sessions",
    icon: MessageSquare,
    to: (id: string) => `/dashboard/${id}/milmgmt/counselling`,
    color: "bg-yellow-700"
  },
  {
    title: "OLQ Assessment",
    description: "Conduct, manage, and review assessments",
    icon: FileText,
    to: (id: string) => `/dashboard/${id}/milmgmt/olq-assessment`,
    color: "bg-green-500"
  },
  {
    title: "Initial Interview",
    description: "Schedule and manage candidate interviews",
    icon: UserCheck,
    to: (id: string) => `/dashboard/${id}/milmgmt/initial-interview`,
    color: "bg-orange-500"
  },
  {
    title: "Terms Interview",
    description: "Schedule and manage candidate interviews",
    icon: UserCheck,
    to: (id: string) => `/dashboard/${id}/milmgmt/interview-term`,
    color: "bg-green-500"
  },
  {
    title: "Credit for Excellence",
    description: "Manage cadet CFE scores and evaluation records",
    icon: FileBadge,
    to: (id: string) => `/dashboard/${id}/milmgmt/credit-excellence`,
    color: "bg-violet-600"
  },
  {
    title: "Physical Training",
    description: "Manage cadet physical training records",
    icon: Dumbbell,
    to: (id: string) => `/dashboard/${id}/milmgmt/physical-training`,
    color: "bg-gray-700"
  },
  {
    title: "Semester Record",
    description: "Manage cadet semester records",
    icon: FileText,
    to: (id: string) => `/dashboard/${id}/milmgmt/semester-record`,
    color: "bg-green-700"
  },
  {
    title: "Final Performance",
    description: "Manage cadet final performance records",
    icon: Medal,
    to: (id: string) => `/dashboard/${id}/milmgmt/final-performance`,
    color: "bg-yellow-700"
  },
  {
    title: "Overall Assessment",
    description: "Manage cadet overall assessment records",
    icon: ClipboardCheck,
    to: (id: string) => `/dashboard/${id}/milmgmt/overall-assessment`,
    color: "bg-yellow-700"
  },
  {
    title: "Academics",
    description: "Manage academic subjects, topics, and study material",
    icon: BookOpen,
    to: (id: string) => `/dashboard/${id}/milmgmt/academics`,
    color: "bg-purple-500"
  }

];


export const scheduledata = [
  { day: "Monday", activity: "Physical Training & Parade", time: "0600-0800", type: "PT" },
  { day: "Tuesday", activity: "Electronics Theory", time: "0900-1200", type: "Academic" },
  { day: "Wednesday", activity: "Mechanical Workshop", time: "1400-1700", type: "Practical" },
  { day: "Thursday", activity: "Field Training Exercise", time: "0800-1600", type: "Field" },
  { day: "Friday", activity: "Assessment & Review", time: "0900-1200", type: "Assessment" },
  { day: "Saturday", activity: "Sports & Recreation", time: "1500-1800", type: "Sports" }
]

export const events = [
  {
    date: "2024-12-15",
    title: "Annual Passing Out Parade",
    description: "Graduation ceremony for the current batch of Officer Cadets",
    location: "Main Parade Ground",
    type: "ceremony"
  },
  {
    date: "2024-12-10",
    title: "Inter-Platoon Sports Competition",
    description: "Annual sports competition between all six platoons",
    location: "Sports Complex",
    type: "sports"
  },
  {
    date: "2024-12-08",
    title: "Technical Symposium on Modern Warfare",
    description: "Expert lectures on electronic warfare and modern military technology",
    location: "Auditorium",
    type: "academic"
  },
  {
    date: "2024-12-05",
    title: "Field Training Exercise - Phase II",
    description: "Advanced tactical training in field conditions",
    location: "Training Area Alpha",
    type: "training"
  },
  {
    date: "2024-12-01",
    title: "Commandant's Inspection",
    description: "Quarterly inspection and review of cadet progress",
    location: "All Areas",
    type: "inspection"
  },
  {
    date: "2024-11-28",
    title: "Alumni Guest Lecture Series",
    description: "Distinguished alumni sharing experiences and insights",
    location: "Conference Hall",
    type: "academic"
  },
  {
    date: "2024-11-25",
    title: "Equipment Maintenance Workshop",
    description: "Hands-on training for electronic and mechanical systems",
    location: "Workshop Complex",
    type: "training"
  },
  {
    date: "2024-11-20",
    title: "Cultural Evening - Mess Night",
    description: "Traditional military mess night with cultural performances",
    location: "Officers' Mess",
    type: "cultural"
  }
]

export const platoonsdata = [
  { name: "Arjun", username: "pltn_arjun_cmdr", id: "uuid_arjun" },
  { name: "Chandragupt", username: "pltn_chandragupt_cmdr", id: "uuid_chandragupt" },
  { name: "Ranapratap", username: "pltn_ranapratap_cmdr", id: "uuid_ranapratap" },
  { name: "Shivaji", username: "pltn_shivaji_cmdr", id: "uuid_shivaji" },
  { name: "Karna", username: "pltn_karna_cmdr", id: "uuid_karna" },
  { name: "Prithviraj", username: "pltn_prithviraj_cmdr", id: "uuid_prithviraj" },
]

export const appointments = [
  "Commander",
  "Deputy Commander",
  "DS Coord",
  "HoAT",
  "CCO",
  "Platoon Commander"
]
export const FALLBACK_PENDING_USERS = [
  {
    id: "970ffcca-3f7a-4191-b057-e02626d1b7f0",
    username: "alice",
    name: "Alice Roy",
    email: "alice@example.com",
    phone: "+91-9999999999",
    rank: "Major",
    note: "Please approve my account",
  },
  {
    id: "f15c8aa0-2d21-48c8-a3f2-4f5c88b0d14e",
    username: "bob",
    name: "Bob Singh",
    email: "bob@example.com",
    phone: "+91-8888888888",
    rank: "Captain",
    note: "Awaiting approval for Platoon Commander role",
  },
];

export const FALLBACK_SLOTS = [
  {
    position: {
      id: "d81a17dd-9c17-4bb9-b45f-875fb1279600",
      key: "HOAT",
      displayName: "HoAT",
    },
    scope: { type: "GLOBAL", id: null, name: "HoAT" },
    occupied: false,
    occupant: null,
  },
  {
    position: {
      id: "f3fdedc1-db12-403a-a104-d9a6cc903be0",
      key: "PLATOON_COMMANDER",
      displayName: "Platoon Commander",
    },
    scope: { type: "GLOBAL", id: null, name: "Platoon Commander" },
    occupied: false,
    occupant: null,
  },
];

export const fallbackUsers = [
  {
    id: "fallback-1",
    username: "ds_coord",
    name: "Alice Roy",
    email: "admin@example.com",
    phone: "+91-0000000000",
    rank: "Admin",
    appointId: "",
    isActive: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "fallback-2",
    username: "hoat",
    name: "Maj Sourav",
    email: "user@example.com",
    phone: "+91-1111111111",
    rank: "Lieutenant",
    appointId: "",
    isActive: true,
    createdAt: "",
    updatedAt: "",
  },
];

export const fallbackAppointments = [
  {
    id: "f67ce8d4-0ef8-4cc0-bd4a-ef5e26802d58",
    userId: "8bf30fde-3cec-4b28-b2a8-1377da9d428a",
    username: "admin",
    positionId: "cd68ec90-c5c2-402e-bcc4-b3876c19ebeb",
    positionKey: "ADMIN",
    positionName: "Admin",
    scopeType: "GLOBAL",
    scopeId: null,
    platoonKey: null,
    platoonName: null,
    startsAt: "2025-10-18T13:18:29.877Z",
    endsAt: null,
    reason: "bootstrap admin",
    deletedAt: null,
    createdAt: "2025-10-18T13:18:29.877Z",
    updatedAt: "2025-10-18T13:18:29.877Z",
  },
  {
    id: "a78b23e4-dfa3-42c1-bc89-fb328a19f113",
    userId: "5b930b1f-72e3-478b-bef0-d24d87167e32",
    username: "commander",
    positionId: "e21ad832-7f0b-49b5-9b8e-df0f048b1a56",
    positionKey: "COMMANDER",
    positionName: "Commander",
    scopeType: "PLATOON",
    scopeId: "alpha-01",
    platoonKey: "ALPHA",
    platoonName: "Alpha Platoon",
    startsAt: "2025-10-15T10:00:00.000Z",
    endsAt: null,
    reason: "initial assignment",
    deletedAt: null,
    createdAt: "2025-10-15T10:00:00.000Z",
    updatedAt: "2025-10-18T14:45:00.000Z",
  },
];


export const activities = [
  {
    name: "Obstacle Course",
    category: "training",
    duration: "2 weeks",
    status: "completed",
  },
  {
    name: "Morning PT",
    category: "training",
    duration: "Daily",
    status: "ongoing",
  },
  {
    name: "Morning PT",
    category: "training",
    duration: "Daily",
    status: "ongoing",
  },
  {
    name: "Football Championship",
    category: "sports",
    duration: "1 week",
    status: "completed",
  },
  {
    name: "Annual Sports Meet",
    category: "sports",
    duration: "3 days",
    status: "ongoing",
  },
  {
    name: "Football Championship",
    category: "sports",
    duration: "1 week",
    status: "completed",
  }
]

export interface Subject {
  id?: string;
  name?: string;
  code?: string;
  instructor?: string;
  semester?: string;
  semNo?: string;
  trgModel?: string;
  subjectType?: string;
  theoryPractical?: string;
  credits?: number;
  coverage?: number;
  theory?: ExamDetails;
  practical?: ExamDetails;
}


export interface ExamDetails {
  credit: number;
  phaseTest1: number;
  phaseTest2: number;
  tutorial: number;
  sessional: number;
  final: number;
  practical: number;
  total: number;
  letterGrade: string;
}

export const subjects: Subject[] = [
  // Semester I
  {
    id: "27",
    name: "ENGINEERING MATHS I",
    code: "MATH101",
    semNo: "I",
    subjectType: "Common",
    theoryPractical: "Theory",
    credits: 4,
  },
  {
    id: "28",
    name: "BASIC MECHANICAL ENGINEERING",
    code: "ME101",
    semNo: "I",
    subjectType: "Common",
    theoryPractical: "Theory",
    credits: 3,
  },
  {
    id: "29",
    name: "BASIC MECHANICAL ENGINEERING",
    code: "ME101P",
    semNo: "I",
    subjectType: "Common",
    theoryPractical: "Practical",
    credits: 1,
  },
  {
    id: "30",
    name: "ENVIRONMENTAL SCIENCE",
    code: "EVS101",
    semNo: "I",
    subjectType: "Common",
    theoryPractical: "Theory",
    credits: 2,
  },

  // Semester II
  {
    id: "1",
    name: "ENGINEERING MATHS II",
    code: "MATH102",
    semNo: "II",
    subjectType: "Common",
    theoryPractical: "Theory",
    credits: 4,
  },
  {
    id: "2",
    name: "ENGINEERING PHYSICS",
    code: "PHY202",
    semNo: "II",
    subjectType: "Common",
    theoryPractical: "Theory",
    credits: 3,
  },
  {
    id: "3",
    name: "ENGINEERING PHYSICS",
    code: "PHY202P",
    semNo: "II",
    subjectType: "Common",
    theoryPractical: "Practical",
    credits: 1,
  },
  {
    id: "4",
    name: "COMPUTER ORG AND PROG CONCEPTS",
    code: "CS201",
    semNo: "II",
    subjectType: "Common",
    theoryPractical: "Theory",
    credits: 3,
  },
  {
    id: "5",
    name: "COMPUTER ORG AND PROG CONCEPTS",
    code: "CS201P",
    semNo: "II",
    subjectType: "Common",
    theoryPractical: "Practical",
    credits: 1,
  },
  {
    id: "6",
    name: "ELECTRICAL TECHNOLOGY",
    code: "EE201",
    semNo: "II",
    subjectType: "Common",
    theoryPractical: "Theory",
    credits: 3,
  },
  {
    id: "7",
    name: "ELECTRICAL TECHNOLOGY",
    code: "EE201P",
    semNo: "II",
    subjectType: "Common",
    theoryPractical: "Practical",
    credits: 1,
  },
  {
    id: "8",
    name: "BASIC ELECTRONICS",
    code: "EC201",
    semNo: "II",
    subjectType: "Common",
    theoryPractical: "Theory",
    credits: 3,
  },

  // Semester III
  {
    id: "9",
    name: "ELECTRICAL MACHINES I",
    code: "EE301",
    semNo: "III",
    subjectType: "Common",
    theoryPractical: "Theory",
    credits: 3,
  },
  {
    id: "10",
    name: "ELECTRICAL MACHINES I",
    code: "EE301P",
    semNo: "III",
    subjectType: "Common",
    theoryPractical: "Practical",
    credits: 1,
  },
  {
    id: "11",
    name: "WORKSHOP PRACTICE",
    code: "WS301",
    semNo: "III",
    subjectType: "Common",
    theoryPractical: "Theory",
    credits: 1,
  },
  {
    id: "12",
    name: "WORKSHOP PRACTICE",
    code: "WS301P",
    semNo: "III",
    subjectType: "Common",
    theoryPractical: "Practical",
    credits: 2,
  },
  {
    id: "13",
    name: "THERMODYNAMICS",
    code: "ME301",
    semNo: "III",
    subjectType: "Common",
    theoryPractical: "Theory",
    credits: 4,
  },
  {
    id: "14",
    name: "POLLUTION AND RENEWABLE ENERGY SOURCES",
    code: "EN301",
    semNo: "III",
    subjectType: "Common",
    theoryPractical: "Theory",
    credits: 3,
  },
  {
    id: "15",
    name: "MILITARY ART III",
    code: "MA301",
    semNo: "III",
    subjectType: "Common",
    theoryPractical: "Theory",
    credits: 1,
  },
  {
    id: "16",
    name: "NSA-II",
    code: "NSA201",
    semNo: "III",
    subjectType: "Common",
    theoryPractical: "Practical",
    credits: 1,
  },
  {
    id: "17",
    name: "STRENGTH OF MATERIALS",
    code: "CE301",
    semNo: "III",
    subjectType: "Mechanical",
    theoryPractical: "Theory",
    credits: 3,
  },

  // Semester IV
  {
    id: "31",
    name: "CONTROL SYSTEMS",
    code: "EE401",
    semNo: "IV",
    subjectType: "Common",
    theoryPractical: "Theory",
    credits: 4,
  },
  {
    id: "32",
    name: "CONTROL SYSTEMS",
    code: "EE401P",
    semNo: "IV",
    subjectType: "Common",
    theoryPractical: "Practical",
    credits: 1,
  },
  {
    id: "33",
    name: "ENGINEERING MATERIALS",
    code: "ME401",
    semNo: "IV",
    subjectType: "Mechanical",
    theoryPractical: "Theory",
    credits: 3,
  },
  {
    id: "34",
    name: "MANUFACTURING TECHNOLOGY",
    code: "ME402",
    semNo: "IV",
    subjectType: "Mechanical",
    theoryPractical: "Theory",
    credits: 3,
  },

  // Semester V
  {
    id: "35",
    name: "INTERNAL COMBUSTION ENGINES",
    code: "ME501",
    semNo: "V",
    subjectType: "Mechanical",
    theoryPractical: "Theory",
    credits: 3,
  },
  {
    id: "36",
    name: "DESIGN OF MACHINE ELEMENTS",
    code: "ME502",
    semNo: "V",
    subjectType: "Mechanical",
    theoryPractical: "Theory",
    credits: 3,
  },
  {
    id: "37",
    name: "HEAT AND MASS TRANSFER",
    code: "ME503",
    semNo: "V",
    subjectType: "Mechanical",
    theoryPractical: "Theory",
    credits: 4,
  },
  {
    id: "38",
    name: "MECHANICAL VIBRATIONS",
    code: "ME504",
    semNo: "V",
    subjectType: "Mechanical",
    theoryPractical: "Theory",
    credits: 3,
  },

  // Semester VI
  {
    id: "18",
    name: "MILITARY ART VI",
    code: "MA601",
    semNo: "VI",
    subjectType: "Common",
    theoryPractical: "Theory",
    credits: 1,
  },
  {
    id: "19",
    name: "MILITARY ART VI",
    code: "MA601P",
    semNo: "VI",
    subjectType: "Common",
    theoryPractical: "Practical",
    credits: 1,
  },
  {
    id: "20",
    name: "NSA VI",
    code: "NSA601",
    semNo: "VI",
    subjectType: "Common",
    theoryPractical: "Practical",
    credits: 1,
  },
  {
    id: "21",
    name: "MACHINE DESIGN I",
    code: "ME601",
    semNo: "VI",
    subjectType: "Mechanical",
    theoryPractical: "Theory",
    credits: 3,
  },
  {
    id: "22",
    name: "THERMAL ENGINEERING",
    code: "ME602",
    semNo: "VI",
    subjectType: "Mechanical",
    theoryPractical: "Theory",
    credits: 3,
  },
  {
    id: "23",
    name: "THERMAL ENGINEERING",
    code: "ME602P",
    semNo: "VI",
    subjectType: "Mechanical",
    theoryPractical: "Practical",
    credits: 1,
  },
  {
    id: "24",
    name: "FINITE ELEMENT METHOD",
    code: "ME603",
    semNo: "VI",
    subjectType: "Mechanical",
    theoryPractical: "Theory",
    credits: 3,
  },
  {
    id: "25",
    name: "AUTOMATION IN MANUFACTURING",
    code: "ME604",
    semNo: "VI",
    subjectType: "Mechanical",
    theoryPractical: "Theory",
    credits: 3,
  },
  {
    id: "26",
    name: "NON DESTRUCTIVE TESTING AND EVALUATION",
    code: "ME605",
    semNo: "VI",
    subjectType: "Mechanical",
    theoryPractical: "Theory",
    credits: 4,
  },
];

export interface courseSections {
  title?: string;
  pageRange?: number;
  progress?: number;
  status: "pending" | "in-progress" | "completed";
  description?: string;
}

export const courseSections = [
  { title: "Dossier Insp Sheet", pageRange: "5-6", progress: 100, status: "completed" as const, description: "Initial inspection and verification documents" },
  { title: "Pers Particulars", pageRange: "7-10", progress: 90, status: "in-progress" as const, description: "Personal details and background information" },
  { title: "SSB Report", pageRange: "11", progress: 75, status: "in-progress" as const, description: "Services Selection Board assessment report" },
  { title: "Med Info", pageRange: "12-14", progress: 60, status: "in-progress" as const, description: "Medical examination records and fitness reports" },
  { title: "Discp Record", pageRange: "15-16", progress: 0, status: "pending" as const, description: "Disciplinary actions and conduct records" },
  { title: "Record of Comm with Parent/Guardian", pageRange: "17-22", progress: 0, status: "pending" as const, description: "Communication logs with family members" },
  { title: "Acad", pageRange: "23-30", progress: 80, status: "in-progress" as const, description: "Academic performance and course records" },
  { title: "Phy Trg", pageRange: "31-37", progress: 85, status: "in-progress" as const, description: "Physical training assessments and progress" },
  { title: "Sports/Games & Motivation Awards", pageRange: "38-39", progress: 40, status: "in-progress" as const, description: "Sports participation and achievement records" },
  { title: "Wpn Trg", pageRange: "40", progress: 20, status: "pending" as const, description: "Weapons training and proficiency records" },
  { title: "Obstacle Trg", pageRange: "41", progress: 30, status: "pending" as const, description: "Obstacle course training and performance" },
  { title: "Camps", pageRange: "42-44", progress: 0, status: "pending" as const, description: "Training camp participation and reports" },
  { title: "Club & Drill", pageRange: "45", progress: 70, status: "in-progress" as const, description: "Drill practice and club activities" },
  { title: "Credit For Excellence (CFE)", pageRange: "46-47", progress: 0, status: "pending" as const, description: "Excellence credits and recognition" },
  { title: "OLQ", pageRange: "44-57", progress: 50, status: "in-progress" as const, description: "Officer Like Qualities assessment" },
  { title: "Semester Performance Record", pageRange: "58-69", progress: 65, status: "in-progress" as const, description: "Detailed semester-wise performance tracking" },
  { title: "Final Performance Record", pageRange: "70", progress: 0, status: "pending" as const, description: "Final assessment and graduation records" },
  { title: "Overall Assessment (on Passing Out)", pageRange: "71-72", progress: 0, status: "pending" as const, description: "Comprehensive final evaluation" },
  { title: "Record of Lve, Hike & Detention", pageRange: "73", progress: 10, status: "pending" as const, description: "Leave, hiking, and detention records" },
  { title: "Interview Detls", pageRange: "74-102", progress: 0, status: "pending" as const, description: "Interview schedules and feedback" },
  { title: "Counselling/Warning Record", pageRange: "103-104", progress: 0, status: "pending" as const, description: "Counselling sessions and warnings issued" },
  { title: "Performance Graph", pageRange: "105-106", progress: 25, status: "pending" as const, description: "Visual performance tracking and analytics" },
  { title: "Indl Course Report", pageRange: "107", progress: 0, status: "pending" as const, description: "Individual course completion report" }
]

export const managementTabs = [
  { value: "Gen Mgmt", title: "Admin Mgmt", icon: Shield },
  { value: "module-mgmt", title: "Module Management", icon: Boxes },
  { value: "settings", title: "Settings", icon: Settings },
];

export const ocTabs = [
  { value: "oc-mgmt", title: "OC Management", icon: Users, link: "/dashboard/genmgmt/ocmgmt" },
  { value: "course-mgmt", title: "Course Management", icon: FileText, link: "/dashboard/genmgmt/coursemgmt" },
  { value: "subject-mgmt", title: "Subject Management", icon: Book, link: "/dashboard/genmgmt/subjectmgmt" },
  { value: "user-mgmt", title: "User Management", icon: Shield, link: "/dashboard/genmgmt/usersmgmt" },
  {
    value: "approval-mgmt",
    title: "Approval Management",
    icon: CheckCircle,
    link: "/dashboard/genmgmt/approvalmgmt"
  },
  {
    value: "appointment-mgmt",
    title: "Appointment Management",
    icon: CalendarDays,
    link: "/dashboard/genmgmt/appointmentmgmt"
  },
  {
    value: "instructors",
    title: "Instructor Management",
    icon: UserCheck,
    link: "/dashboard/genmgmt/instructors",
  },
  // {
  //   value: "offerings",
  //   title: "Offerings Management",
  //   icon: Package,
  //   link: "/dashboard/genmgmt/offerings",
  // },
  {
    value: "platoon-management",
    title: "Platoon Management",
    icon: Users,
    link: "/dashboard/genmgmt/platoon-management",
  }
];

export const moduleManagementTabs = [
  {
    value: "relegation",
    title: "Relegation Management",
    icon: ArrowDownCircle,
    link: "/dashboard/genmgmt/relegation",
  },
  {
    value: "camps",
    title: "Camps Management",
    icon: Tent,
    link: "/dashboard/genmgmt/camps",
  },
  {
    value: "punishments",
    title: "Punishment Management",
    icon: ShieldAlert,
    link: "/dashboard/genmgmt/punishments",
  },
  {
    value: "interviews-mgmt",
    title: "Interview Management",
    icon: MessageSquare,
    link: "/dashboard/genmgmt/interviews-mgmt",
  },
  {
    value: "pt-mgmt",
    title: "Physical Training Management",
    icon: Dumbbell,
    link: "/dashboard/genmgmt/pt-mgmt",
  }
];

export const ocTabsWithDropdown = [
  {
    value: "oc-mgmt",
    title: "OC Management",
    icon: Users,
    link: "/dashboard/genmgmt/ocmgmt"
  },
  {
    value: "course-mgmt",
    title: "Course Management",
    icon: FileText,
    link: "/dashboard/genmgmt/coursemgmt"
  },
  {
    value: "subject-mgmt",
    title: "Subject Management",
    icon: Book,
    link: "/dashboard/genmgmt/subjectmgmt"
  },
  {
    value: "admin-mgmt",
    title: "Admin",
    icon: Settings,
    dropdownItems: [
      {
        title: "User Management",
        icon: Shield,
        color: "text-blue-600",
        href: "/dashboard/genmgmt/usersmgmt"
      },
      {
        title: "Approval Management",
        icon: CheckCircle,
        color: "text-green-600",
        href: "/dashboard/genmgmt/approvalmgmt"
      },
      {
        title: "Appointment Management",
        icon: CalendarDays,
        color: "text-purple-600",
        href: "/dashboard/genmgmt/appointmentmgmt"
      },
      {
        title: "Instructor Management",
        icon: UserCheck,
        color: "text-orange-600",
        href: "/dashboard/genmgmt/instructors"
      }
    ]
  }
];

export const semesterTabs = [
  { value: "semester-i", title: "Semester I" },
  { value: "semester-ii", title: "Semester II" },
  { value: "semester-iii", title: "Semester III" },
  { value: "semester-iv", title: "Semester IV" },
  { value: "semester-v", title: "Semester V" },
  { value: "semester-vi", title: "Semester VI" },
];
export const miltrgTabs = [
  {
    value: "basic-details",
    title: "Basic Details",
    icon: User,
  },
  {
    value: "mil-trg",
    title: "Mil-Trg",
    icon: Shield,
  },
  {
    value: "settings",
    title: "Academics",
    icon: BookOpen,
  },
];

export const dossierTabs = [
  {
    value: "initial-interview",
    title: "Initial Interview",
    icon: UserCheck,
  },
  {
    value: "interview-term",
    title: "Terms Interview",
    icon: UserCheck,
  },
  {
    value: "speed-march",
    title: "Speed March / Runs",
    icon: Timer,
  },
  {
    value: "credit-excellence",
    title: "Credit for Excellence",
    icon: FileBadge,
  },
  {
    value: "dossier-insp",
    title: "Dossier Insp Sheet",
    icon: ClipboardCheck,
  },
  {
    value: "obstacle-trg",
    title: "Obstacle Training",
    icon: Mountain,
  },
  {
    value: "comn-parents",
    title: "Parent Communication",
    icon: Phone,
  },
  {
    value: "discip-records",
    title: "Discipline Records",
    icon: ShieldAlert,
  },
  {
    value: "med-record",
    title: "Medical Records",
    icon: HeartPulse,
  },
  {
    value: "background-detls",
    title: "Background Detls",
    icon: FileSearch,
  },
  {
    value: "pers-particulars",
    title: "Pers Particulars",
    icon: User,
  },
  {
    value: "ssb-reports",
    title: "SSB Reports",
    icon: FileText,
  },
  {
    value: "mil-trg",
    title: "Mil-Trg",
    icon: Shield,
  },
  {
    value: "sports-awards",
    title: "Sports & Motivation Awards",
    icon: Trophy,
  },
  {
    value: "wpn-trg",
    title: "Weapon Training",
    icon: Target,
  },
  {
    value: "club-detls",
    title: "Club Details",
    icon: BookMarked,
  },
  {
    value: "counselling",
    title: "Counselling",
    icon: MessageSquare,
  },
  {
    value: "hikes",
    title: "Hike Records",
    icon: Footprints,
  },
  {
    value: "leave-record",
    title: "Leave Records",
    icon: Calendar,
  },
  {
    value: "detention",
    title: "Detention",
    icon: Ban,
  },
  {
    value: "olq-assessment",
    title: "OLQ Assessment",
    icon: FileText,
  },
  {
    value: "camps",
    title: "Camps",
    icon: Tent,

  },
  {
    value: "semester-record",
    title: "Semester Record",
    icon: Book,
  },
  {
    value: "final-performance",
    title: "Final Performance",
    icon: Medal,
  },
  {
    value: "dossier-snapshot",
    title: "Dossier Snapshot",
    icon: ClipboardList,
  },
  {
    value: "dossier-filling",
    title: "Dossier Filling",
    icon: NotebookPen,
  },
  {
    value: "physical-training",
    title: "Physical Training",
    icon: Dumbbell,
  },
  {
    value: "overall-assessment",
    title: "Overall Assessment",
    icon: ClipboardCheck,
  },
  {
    value: "performance-graph",
    title: "Performance Graph",
    icon: ChartArea,
  },
  {
    value: "academics",
    title: "Academics",
    icon: BookOpen,
  }
];

export const backgroundTabs = [
  { value: "family-bgrnd", title: "Family Background" },
  { value: "edn-qlf", title: "Educational Qualification" },
  { value: "achievements", title: "Achievements" },
  { value: "auto-bio", title: "Autobiography" },
];



export type OCRecord = {
  tesNo: string;
  name: string;
  course: string;
  dtOfArrival: string;
  visibleIdenMks: string;
  pl: string;
  dob: string;
  placeOfBirth: string;
  domicile: string;
  religion: string;
  nationality: string;
  bloodGp: string;
  idenMarks: string;
  fatherName: string;
  fatherMobile: string;
  fatherAddress: string;
  fatherProfession: string;
  guardianName: string;
  guardianAddress: string;
  monthlyIncome: string;
  nokDetails: string;
  nokAddress: string;
  nearestRlyStn: string;
  secunderabadAddr: string;
  relativeArmedForces: string;
  govtFinAsst: string;
  mobNo: string;
  email: string;
  passportNo: string;
  panCardNo: string;
  aadharNo: string;
  bankDetails: string;
  idCardNo: string;
  upscRollNo: string;
  ssbCentre: string;
  games: string;
  hobbies: string;
  swimmerStatus: string;
  language: string;
};

export const fallbackCourses: Course[] = ([
  { id: "6a7e3a5e-1b4f-42b6-b6ff-7ad1a244b001", courseNo: "TES-43", startDate: "10-02-2024", endDate: "10-09-2025", trgModel: 0 },
  { id: "2", courseNo: "TES-44", startDate: "03-01-2022", endDate: "14-12-2024", trgModel: 0 },
  { id: "3", courseNo: "TES-45", startDate: "04-07-2022", endDate: "14-06-2025", trgModel: 0 },
  { id: "4", courseNo: "TES-46", startDate: "02-01-2023", endDate: "11-12-2025", trgModel: 0 },
  { id: "5", courseNo: "TES-47", startDate: "03-07-2023", endDate: "13-06-2026", trgModel: 0 },
  { id: "6", courseNo: "TES-48", startDate: "01-01-2024", endDate: "12-12-2026", trgModel: 0 },
  { id: "7", courseNo: "TES-49", startDate: "01-07-2024", endDate: "12-06-2027", trgModel: 0 },
  { id: "8", courseNo: "TES-49A", startDate: "30-01-2025", endDate: "11-12-2027", trgModel: 0 },
]);

export const navItems = [
  { name: "Platoons", path: "/#platoons" },
  { name: "Commander's Corner", path: "/#commanders-corner" },
  { name: "Gallantry Awards", path: "/#gallantry-awards" },
  { name: "History", path: "/#history" },
  { name: "Events & News", path: "/#events-news" },
];

export const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    ceremony: "bg-purple-100 text-purple-800",
    sports: "bg-green-100 text-green-800",
    academic: "bg-blue-100 text-blue-800",
    training: "bg-orange-100 text-orange-800",
    inspection: "bg-red-100 text-red-800",
    cultural: "bg-pink-100 text-pink-800",
  };
  return colors[type] || "bg-gray-100 text-gray-800";
};

export const ratingMap: Record<number, string> = {
  9: "OS",
  8: "WAA",
  7: "AA",
  6: "JAA",
  5: "HA",
  4: "LA",
  3: "JBA",
  2: "BA",
  1: "WBA",
  0: "Poor",
};

export const reverseRatingMap: Record<string, number> = Object.fromEntries(
  Object.entries(ratingMap).map(([k, v]) => [v, Number(k)])
);
