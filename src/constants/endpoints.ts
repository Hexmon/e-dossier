import { platoons } from "@/app/db"
import { string } from "zod"

export const baseURL = 'http://localhost:3000'

export const endpoints = {
    auth: {
        login: "/api/v1/auth/login",
        signup: "/api/v1/auth/signup",
        logout: "/api/v1/auth/logout",
    },
    admin: {
        approval: "/api/v1/admin/signup-requests",
        appointments: "/api/v1/admin/appointments?active=true",
        platoons: "/api/v1/platoons",
        slots: "/api/v1/admin/positions/slots",
        transferappt: (appointmentId: string) =>
            `/api/v1/admin/appointments/${appointmentId}/transfer`,

        users: "/api/v1/admin/users",
    },
    oc: {
        list: "/api/v1/oc",
        create: "/api/v1/oc",
        update: (ocId: string) => `/api/v1/oc/${ocId}`,
        delete: (ocId: string) => `/api/v1/oc/${ocId}`,
        personal: (ocId: string) => `/api/v1/oc/${ocId}/personal`,
        family: (ocId: string) => `/api/v1/oc/${ocId}/family`,
        education: (ocId: string) => `/api/v1/oc/${ocId}/education`,
        achievements: (ocId: string) => `/api/v1/oc/${ocId}/achievements`,
        autobiography: (ocId: string) => `/api/v1/oc/${ocId}/autobiography`,
        ssbreport: (ocId: string) => `/api/v1/oc/${ocId}/ssb`,
        medical: (ocId: string) => `/api/v1/oc/${ocId}/medical`,
        medicalCategory: (ocId: string) => `/api/v1/oc/${ocId}/medical-category`,
        discipline: (ocId: string) => `/api/v1/oc/${ocId}/discipline`,
        parentComms: (ocId: string) => `/api/v1/oc/${ocId}/parent-comms`,
        bulkUpload: "/api/v1/oc/bulk-upload",
        familyById: (ocId: string, familyId: string) =>
            `/api/v1/oc/${ocId}/family/${familyId}`,
        achievementById: (ocId: string, achId: string) =>
            `/api/v1/oc/${ocId}/achievements/${achId}`,
        medicalById: (ocId: string, medId: string) =>
            `/api/v1/oc/${ocId}/medical/${medId}`,
        medcatById: (ocId: string, mcatId: string) =>
            `/api/v1/oc/${ocId}/medical-category/${mcatId}`,
        discipRec: (ocId: string, discId: string) =>
            `/api/v1/oc/${ocId}/discipline/${discId}`,
        parentCommsById: (ocId: string, commId: string) =>
            `/api/v1/oc/${ocId}/parent-comms/${commId}`,
        sportsAndGames: (ocId: string) => `/api/v1/oc/${ocId}/sports-and-games`,
        motivationAwards: (ocId: string) => `/api/v1/oc/${ocId}/motivation-awards`,
        motivationAwardById: (ocId: string, awardId: string) =>
            `/api/v1/oc/${ocId}/motivation-awards/${awardId}`,
        sportsAndGamesById: (ocId: string, recordId: string) =>
            `/api/v1/oc/${ocId}/sports-and-games/${recordId}`,
        weaponTraining: (ocId: string) => `/api/v1/oc/${ocId}/weapon-training`,
        weaponTrainingById: (ocId: string, recordId: string) =>
            `/api/v1/oc/${ocId}/weapon-training/${recordId}`,
        specialAchievementInFiring: (ocId: string) => `/api/v1/oc/${ocId}/special-achievement-in-firing`,
        specialAchievementInFiringById: (ocId: string, recordId: string) =>
            `/api/v1/oc/${ocId}/special-achievement-in-firing/${recordId}`,
        obstacleTraining: (ocId: string) => `/api/v1/oc/${ocId}/obstacle-training`,
        obstacleTrainingById: (ocId: string, recordId: string) =>
            `/api/v1/oc/${ocId}/obstacle-training/${recordId}`,
        speedMarch: (ocId: string) => `/api/v1/oc/${ocId}/speed-march`,
        speedMarchById: (ocId: string, recordId: string) =>
            `/api/v1/oc/${ocId}/speed-march/${recordId}`,
    },
    course: {
        all: "/api/v1/courses"
    },
    users: {
        checkUsername: "/api/v1/admin/users/check-username",
    },
}