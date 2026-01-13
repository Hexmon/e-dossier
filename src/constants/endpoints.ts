import { platoons } from "@/app/db"
import { get } from "http"
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
        subjects: "/api/v1/admin/subjects",
        subjectById: (subjectId: string) => `/api/v1/admin/subjects/${subjectId}`,
        instructors: "/api/v1/admin/instructors",
        instructorById: (id: string) => `/api/v1/admin/instructors/${id}`,
        punishments: "/api/v1/admin/punishments",
        punishmentById: (punishmentId: string) => `/api/v1/admin/punishments/${punishmentId}`,
        courseOfferings: (courseId: string) =>
            `/api/v1/admin/courses/${courseId}/offerings`,
        courseOfferingById: (courseId: string, offeringId: string) =>
            `/api/v1/admin/courses/${courseId}/offerings/${offeringId}`,
        trainingCamps: {
            list: "/api/v1/admin/training-camps",
            getById: (campId: string) => `/api/v1/admin/training-camps/${campId}`,
            create: "/api/v1/admin/training-camps",
            update: (campId: string) => `/api/v1/admin/training-camps/${campId}`,
            delete: (campId: string) => `/api/v1/admin/training-camps/${campId}`,
        },
    },
    oc: {
        list: "/api/v1/oc",
        create: "/api/v1/oc",
        getById: (ocId: string) => `/api/v1/oc/${ocId}`,
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
        clubDetls: (ocId: string) => `/api/v1/oc/${ocId}/clubs`,
        clubDetlsById: (ocId: string, clubDtlId: string) =>
            `/api/v1/oc/${ocId}/clubs/${clubDtlId}`,
        counselling: (ocId: string) => `/api/v1/oc/${ocId}/counselling`,
        counsellingById: (ocId: string, counsellingId: string) =>
            `/api/v1/oc/${ocId}/counselling/${counsellingId}`,
        drill: (ocId: string) => `/api/v1/oc/${ocId}/drill`,
        drillById: (ocId: string, drillId: string) => `/api/v1/oc/${ocId}/drill/${drillId}`,
        clubAchievement: (ocId: string) => `/api/v1/oc/${ocId}/club-achievements`,
        clubAchievementById: (ocId: string, achId: string) => `/api/v1/oc/${ocId}/club-achievements/${achId}`,
        leaveRecord: (ocId: string) => `/api/v1/oc/${ocId}/recording-leave-hike-detention`,
        leaveRecordById: (ocId: string, recordId: string) => `/api/v1/oc/${ocId}/recording-leave-hike-detention/${recordId}`,
        olq: (ocId: string) => `/api/v1/oc/${ocId}/olq`,
        olqCategories: (ocId: string) => `/api/v1/oc/${ocId}/olq/categories?includeSubtitles=true&isActive=true`,
        camps: {
            list: (ocId: string) => `/api/v1/oc/${ocId}/camps`,
            create: (ocId: string) => `/api/v1/oc/${ocId}/camps`,
            update: (ocId: string) => `/api/v1/oc/${ocId}/camps`,
            delete: (ocId: string, ocCampId: string) => `/api/v1/oc/${ocId}/camps/${ocCampId}`,
        },
        academics: {
            list: (ocId: string) => `/api/v1/oc/${ocId}/academics`,
            getBySemester: (ocId: string, semester: number) =>
                `/api/v1/oc/${ocId}/academics/${semester}`,
            updateSemester: (ocId: string, semester: number) =>
                `/api/v1/oc/${ocId}/academics/${semester}`,
            deleteSemester: (ocId: string, semester: number) =>
                `/api/v1/oc/${ocId}/academics/${semester}`,
            updateSubject: (ocId: string, semester: number, subjectId: string) =>
                `/api/v1/oc/${ocId}/academics/${semester}/subjects/${subjectId}`,
            deleteSubject: (ocId: string, semester: number, subjectId: string) =>
                `/api/v1/oc/${ocId}/academics/${semester}/subjects/${subjectId}`,
        },
    },
    course: {
        all: "/api/v1/admin/courses"
    },
    users: {
        checkUsername: "/api/v1/admin/users/check-username",
    },
}