import { platoons } from "@/app/db"

export const baseURL = 'http://localhost:3000'

export const endpoints = {
    auth: {
        login: "/api/v1/auth/login",
        signup: "/api/v1/auth/signup"
    },
    admin: {
        approval: "/api/v1/admin/signup-requests",
        appointments: "/api/v1/admin/appointments",
        platoons: "/api/v1/platoons",
        slots: "/api/v1/admin/positions/slots"
    }
}