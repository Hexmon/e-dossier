import { platoons } from "@/app/db"

export const baseURL = 'http://localhost:3000'

export const endpoints = {
    auth: {
        login: "/api/v1/auth/login",
        signup: "/api/v1/auth/signup"
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
        achievements: (ocId: string) => `/api/v1/oc/${ocId}/achievements`
    },
    course: {
        all: "/api/v1/courses"
    },
    users: {
        checkUsername: "/api/v1/admin/users/check-username",
    },
}