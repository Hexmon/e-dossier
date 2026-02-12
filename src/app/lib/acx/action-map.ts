export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type ApiActionEntry = {
  method: HttpMethod;
  path: string;
  action: string;
  resourceType: string;
  category: string;
  fieldLevelCandidate: boolean;
  adminBaseline: boolean;
};

export type PageActionEntry = {
  route: string;
  action: string;
  resourceType: string;
  category: string;
  adminBaseline: boolean;
};

export const API_ACTION_MAP: ApiActionEntry[] = [
  {
    "method": "DELETE",
    "path": "/api/v1/admin/appointments/:id",
    "action": "admin:appointments:delete",
    "resourceType": "admin:appointments",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/courses/:courseId",
    "action": "admin:courses:delete",
    "resourceType": "admin:courses",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/courses/:courseId/offerings/:offeringId",
    "action": "admin:courses:offerings:delete",
    "resourceType": "admin:courses:offerings",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/discipline/:id",
    "action": "admin:discipline:delete",
    "resourceType": "admin:discipline",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/instructors/:id",
    "action": "admin:instructors:delete",
    "resourceType": "admin:instructors",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/interview/templates/:templateId",
    "action": "admin:interview:templates:delete",
    "resourceType": "admin:interview:templates",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/interview/templates/:templateId/fields/:fieldId",
    "action": "admin:interview:templates:fields:delete",
    "resourceType": "admin:interview:templates:fields",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/interview/templates/:templateId/fields/:fieldId/options/:optionId",
    "action": "admin:interview:templates:fields:options:delete",
    "resourceType": "admin:interview:templates:fields:options",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/interview/templates/:templateId/groups/:groupId",
    "action": "admin:interview:templates:groups:delete",
    "resourceType": "admin:interview:templates:groups",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/interview/templates/:templateId/sections/:sectionId",
    "action": "admin:interview:templates:sections:delete",
    "resourceType": "admin:interview:templates:sections",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/interview/templates/:templateId/semesters/:semester",
    "action": "admin:interview:templates:semesters:delete",
    "resourceType": "admin:interview:templates:semesters",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/physical-training/motivation-fields/:id",
    "action": "admin:physical-training:motivation-fields:delete",
    "resourceType": "admin:physical-training:motivation-fields",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/physical-training/types/:typeId",
    "action": "admin:physical-training:types:delete",
    "resourceType": "admin:physical-training:types",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/physical-training/types/:typeId/attempts/:attemptId",
    "action": "admin:physical-training:types:attempts:delete",
    "resourceType": "admin:physical-training:types:attempts",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/physical-training/types/:typeId/attempts/:attemptId/grades/:gradeId",
    "action": "admin:physical-training:types:attempts:grades:delete",
    "resourceType": "admin:physical-training:types:attempts:grades",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/physical-training/types/:typeId/tasks/:taskId",
    "action": "admin:physical-training:types:tasks:delete",
    "resourceType": "admin:physical-training:types:tasks",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/physical-training/types/:typeId/tasks/:taskId/scores/:scoreId",
    "action": "admin:physical-training:types:tasks:scores:delete",
    "resourceType": "admin:physical-training:types:tasks:scores",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/positions/:id",
    "action": "admin:positions:delete",
    "resourceType": "admin:positions",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/punishments/:id",
    "action": "admin:punishments:delete",
    "resourceType": "admin:punishments",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/rbac/field-rules/:ruleId",
    "action": "admin:rbac:field-rules:delete",
    "resourceType": "admin:rbac:field-rules",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/rbac/permissions/:permissionId",
    "action": "admin:rbac:permissions:delete",
    "resourceType": "admin:rbac:permissions",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/rbac/roles/:roleId",
    "action": "admin:rbac:roles:delete",
    "resourceType": "admin:rbac:roles",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/signup-requests/:id",
    "action": "admin:signup-requests:delete",
    "resourceType": "admin:signup-requests",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/site-settings/awards/:id",
    "action": "admin:site-settings:awards:delete",
    "resourceType": "admin:site-settings:awards",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/site-settings/awards/:id/hard",
    "action": "admin:site-settings:awards:hard:delete",
    "resourceType": "admin:site-settings:awards:hard",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/site-settings/commanders/:id",
    "action": "admin:site-settings:commanders:delete",
    "resourceType": "admin:site-settings:commanders",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/site-settings/commanders/:id/hard",
    "action": "admin:site-settings:commanders:hard:delete",
    "resourceType": "admin:site-settings:commanders:hard",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/site-settings/history/:id",
    "action": "admin:site-settings:history:delete",
    "resourceType": "admin:site-settings:history",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/site-settings/history/:id/hard",
    "action": "admin:site-settings:history:hard:delete",
    "resourceType": "admin:site-settings:history:hard",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/site-settings/logo",
    "action": "admin:site-settings:logo:delete",
    "resourceType": "admin:site-settings:logo",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/subjects/:id",
    "action": "admin:subjects:delete",
    "resourceType": "admin:subjects",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/training-camps/:campId",
    "action": "admin:training-camps:delete",
    "resourceType": "admin:training-camps",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/training-camps/:campId/activities/:activityId",
    "action": "admin:training-camps:activities:delete",
    "resourceType": "admin:training-camps:activities",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/users/:id",
    "action": "admin:users:delete",
    "resourceType": "admin:users",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId",
    "action": "oc:delete",
    "resourceType": "oc",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/academics/:semester",
    "action": "oc:academics:delete",
    "resourceType": "oc:academics",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/academics/:semester/subjects/:subjectId",
    "action": "oc:academics:subjects:delete",
    "resourceType": "oc:academics:subjects",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/achievements/:id",
    "action": "oc:achievements:delete",
    "resourceType": "oc:achievements",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/autobiography",
    "action": "oc:autobiography:delete",
    "resourceType": "oc:autobiography",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/camps",
    "action": "oc:camps:delete",
    "resourceType": "oc:camps",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/club-achievements/:id",
    "action": "oc:club-achievements:delete",
    "resourceType": "oc:club-achievements",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/clubs/:id",
    "action": "oc:clubs:delete",
    "resourceType": "oc:clubs",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/counselling/:id",
    "action": "oc:counselling:delete",
    "resourceType": "oc:counselling",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/credit-for-excellence/:id",
    "action": "oc:credit-for-excellence:delete",
    "resourceType": "oc:credit-for-excellence",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/discipline/:id",
    "action": "oc:discipline:delete",
    "resourceType": "oc:discipline",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/dossier-filling",
    "action": "oc:dossier-filling:delete",
    "resourceType": "oc:dossier-filling",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/dossier-inspection",
    "action": "oc:dossier-inspection:delete",
    "resourceType": "oc:dossier-inspection",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/drill/:id",
    "action": "oc:drill:delete",
    "resourceType": "oc:drill",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/education/:id",
    "action": "oc:education:delete",
    "resourceType": "oc:education",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/family/:id",
    "action": "oc:family:delete",
    "resourceType": "oc:family",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/images",
    "action": "oc:images:delete",
    "resourceType": "oc:images",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/interviews/:interviewId",
    "action": "oc:interviews:delete",
    "resourceType": "oc:interviews",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/medical-category/:id",
    "action": "oc:medical-category:delete",
    "resourceType": "oc:medical-category",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/medical/:id",
    "action": "oc:medical:delete",
    "resourceType": "oc:medical",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/motivation-awards/:id",
    "action": "oc:motivation-awards:delete",
    "resourceType": "oc:motivation-awards",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/obstacle-training/:id",
    "action": "oc:obstacle-training:delete",
    "resourceType": "oc:obstacle-training",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/olq",
    "action": "oc:olq:delete",
    "resourceType": "oc:olq",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/olq/categories/:categoryId",
    "action": "oc:olq:categories:delete",
    "resourceType": "oc:olq:categories",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/olq/subtitles/:subtitleId",
    "action": "oc:olq:subtitles:delete",
    "resourceType": "oc:olq:subtitles",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/parent-comms/:id",
    "action": "oc:parent-comms:delete",
    "resourceType": "oc:parent-comms",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/personal",
    "action": "oc:personal:delete",
    "resourceType": "oc:personal",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/physical-training",
    "action": "oc:physical-training:delete",
    "resourceType": "oc:physical-training",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/physical-training/motivation-awards",
    "action": "oc:physical-training:motivation-awards:delete",
    "resourceType": "oc:physical-training:motivation-awards",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/recording-leave-hike-detention/:id",
    "action": "oc:recording-leave-hike-detention:delete",
    "resourceType": "oc:recording-leave-hike-detention",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/special-achievement-in-firing/:id",
    "action": "oc:special-achievement-in-firing:delete",
    "resourceType": "oc:special-achievement-in-firing",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/speed-march/:id",
    "action": "oc:speed-march:delete",
    "resourceType": "oc:speed-march",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/sports-and-games/:id",
    "action": "oc:sports-and-games:delete",
    "resourceType": "oc:sports-and-games",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/ssb",
    "action": "oc:ssb:delete",
    "resourceType": "oc:ssb",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/ssb/points/:id",
    "action": "oc:ssb:points:delete",
    "resourceType": "oc:ssb:points",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/oc/:ocId/weapon-training/:id",
    "action": "oc:weapon-training:delete",
    "resourceType": "oc:weapon-training",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/platoons",
    "action": "platoons:delete",
    "resourceType": "platoons",
    "category": "platoons",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "DELETE",
    "path": "/api/v1/platoons/:idOrKey",
    "action": "platoons:delete",
    "resourceType": "platoons",
    "category": "platoons",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/appointments",
    "action": "admin:appointments:read",
    "resourceType": "admin:appointments",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/appointments/:id",
    "action": "admin:appointments:read",
    "resourceType": "admin:appointments",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/audit-logs",
    "action": "admin:audit-logs:read",
    "resourceType": "admin:audit-logs",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/courses",
    "action": "admin:courses:read",
    "resourceType": "admin:courses",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/courses/:courseId",
    "action": "admin:courses:read",
    "resourceType": "admin:courses",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/courses/:courseId/offerings",
    "action": "admin:courses:offerings:read",
    "resourceType": "admin:courses:offerings",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/courses/:courseId/offerings/:offeringId",
    "action": "admin:courses:offerings:read",
    "resourceType": "admin:courses:offerings",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/device-site-settings",
    "action": "admin:device-site-settings:read",
    "resourceType": "admin:device-site-settings",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/relegation/courses",
    "action": "admin:relegation:courses:read",
    "resourceType": "admin:relegation:courses",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/relegation/ocs",
    "action": "admin:relegation:ocs:read",
    "resourceType": "admin:relegation:ocs",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/discipline",
    "action": "admin:discipline:read",
    "resourceType": "admin:discipline",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/instructors",
    "action": "admin:instructors:read",
    "resourceType": "admin:instructors",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/instructors/:id",
    "action": "admin:instructors:read",
    "resourceType": "admin:instructors",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/interview/templates",
    "action": "admin:interview:templates:read",
    "resourceType": "admin:interview:templates",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/interview/templates/:templateId",
    "action": "admin:interview:templates:read",
    "resourceType": "admin:interview:templates",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/interview/templates/:templateId/fields/:fieldId",
    "action": "admin:interview:templates:fields:read",
    "resourceType": "admin:interview:templates:fields",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/interview/templates/:templateId/fields/:fieldId/options",
    "action": "admin:interview:templates:fields:options:read",
    "resourceType": "admin:interview:templates:fields:options",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/interview/templates/:templateId/fields/:fieldId/options/:optionId",
    "action": "admin:interview:templates:fields:options:read",
    "resourceType": "admin:interview:templates:fields:options",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/interview/templates/:templateId/groups",
    "action": "admin:interview:templates:groups:read",
    "resourceType": "admin:interview:templates:groups",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/interview/templates/:templateId/groups/:groupId",
    "action": "admin:interview:templates:groups:read",
    "resourceType": "admin:interview:templates:groups",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/interview/templates/:templateId/groups/:groupId/fields",
    "action": "admin:interview:templates:groups:fields:read",
    "resourceType": "admin:interview:templates:groups:fields",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/interview/templates/:templateId/sections",
    "action": "admin:interview:templates:sections:read",
    "resourceType": "admin:interview:templates:sections",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/interview/templates/:templateId/sections/:sectionId",
    "action": "admin:interview:templates:sections:read",
    "resourceType": "admin:interview:templates:sections",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/interview/templates/:templateId/sections/:sectionId/fields",
    "action": "admin:interview:templates:sections:fields:read",
    "resourceType": "admin:interview:templates:sections:fields",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/interview/templates/:templateId/semesters",
    "action": "admin:interview:templates:semesters:read",
    "resourceType": "admin:interview:templates:semesters",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/physical-training/motivation-fields",
    "action": "admin:physical-training:motivation-fields:read",
    "resourceType": "admin:physical-training:motivation-fields",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/physical-training/motivation-fields/:id",
    "action": "admin:physical-training:motivation-fields:read",
    "resourceType": "admin:physical-training:motivation-fields",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/physical-training/templates",
    "action": "admin:physical-training:templates:read",
    "resourceType": "admin:physical-training:templates",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/physical-training/types",
    "action": "admin:physical-training:types:read",
    "resourceType": "admin:physical-training:types",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/physical-training/types/:typeId",
    "action": "admin:physical-training:types:read",
    "resourceType": "admin:physical-training:types",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/physical-training/types/:typeId/attempts",
    "action": "admin:physical-training:types:attempts:read",
    "resourceType": "admin:physical-training:types:attempts",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/physical-training/types/:typeId/attempts/:attemptId",
    "action": "admin:physical-training:types:attempts:read",
    "resourceType": "admin:physical-training:types:attempts",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/physical-training/types/:typeId/attempts/:attemptId/grades",
    "action": "admin:physical-training:types:attempts:grades:read",
    "resourceType": "admin:physical-training:types:attempts:grades",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/physical-training/types/:typeId/attempts/:attemptId/grades/:gradeId",
    "action": "admin:physical-training:types:attempts:grades:read",
    "resourceType": "admin:physical-training:types:attempts:grades",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/physical-training/types/:typeId/tasks",
    "action": "admin:physical-training:types:tasks:read",
    "resourceType": "admin:physical-training:types:tasks",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/physical-training/types/:typeId/tasks/:taskId",
    "action": "admin:physical-training:types:tasks:read",
    "resourceType": "admin:physical-training:types:tasks",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/physical-training/types/:typeId/tasks/:taskId/scores",
    "action": "admin:physical-training:types:tasks:scores:read",
    "resourceType": "admin:physical-training:types:tasks:scores",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/physical-training/types/:typeId/tasks/:taskId/scores/:scoreId",
    "action": "admin:physical-training:types:tasks:scores:read",
    "resourceType": "admin:physical-training:types:tasks:scores",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/positions",
    "action": "admin:positions:read",
    "resourceType": "admin:positions",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/positions/:id",
    "action": "admin:positions:read",
    "resourceType": "admin:positions",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/positions/active-holder",
    "action": "admin:positions:active-holder:read",
    "resourceType": "admin:positions:active-holder",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/positions/slots",
    "action": "admin:positions:slots:read",
    "resourceType": "admin:positions:slots",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/punishments",
    "action": "admin:punishments:read",
    "resourceType": "admin:punishments",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/punishments/:id",
    "action": "admin:punishments:read",
    "resourceType": "admin:punishments",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/rbac/field-rules",
    "action": "admin:rbac:field-rules:read",
    "resourceType": "admin:rbac:field-rules",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/rbac/mappings",
    "action": "admin:rbac:mappings:read",
    "resourceType": "admin:rbac:mappings",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/rbac/permissions",
    "action": "admin:rbac:permissions:read",
    "resourceType": "admin:rbac:permissions",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/rbac/roles",
    "action": "admin:rbac:roles:read",
    "resourceType": "admin:rbac:roles",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/signup-requests",
    "action": "admin:signup-requests:read",
    "resourceType": "admin:signup-requests",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/site-settings",
    "action": "admin:site-settings:read",
    "resourceType": "admin:site-settings",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/site-settings/awards",
    "action": "admin:site-settings:awards:read",
    "resourceType": "admin:site-settings:awards",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/site-settings/awards/:id",
    "action": "admin:site-settings:awards:read",
    "resourceType": "admin:site-settings:awards",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/site-settings/commanders",
    "action": "admin:site-settings:commanders:read",
    "resourceType": "admin:site-settings:commanders",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/site-settings/commanders/:id",
    "action": "admin:site-settings:commanders:read",
    "resourceType": "admin:site-settings:commanders",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/site-settings/history",
    "action": "admin:site-settings:history:read",
    "resourceType": "admin:site-settings:history",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/site-settings/history/:id",
    "action": "admin:site-settings:history:read",
    "resourceType": "admin:site-settings:history",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/subjects",
    "action": "admin:subjects:read",
    "resourceType": "admin:subjects",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/subjects/:id",
    "action": "admin:subjects:read",
    "resourceType": "admin:subjects",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/training-camps",
    "action": "admin:training-camps:read",
    "resourceType": "admin:training-camps",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/training-camps/:campId",
    "action": "admin:training-camps:read",
    "resourceType": "admin:training-camps",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/training-camps/:campId/activities",
    "action": "admin:training-camps:activities:read",
    "resourceType": "admin:training-camps:activities",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/training-camps/:campId/activities/:activityId",
    "action": "admin:training-camps:activities:read",
    "resourceType": "admin:training-camps:activities",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/users",
    "action": "admin:users:read",
    "resourceType": "admin:users",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/users/:id",
    "action": "admin:users:read",
    "resourceType": "admin:users",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/users/check-username",
    "action": "admin:users:check-username:read",
    "resourceType": "admin:users:check-username",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "GET",
    "path": "/api/v1/appointments/:id/active-user",
    "action": "appointments:active-user:read",
    "resourceType": "appointments:active-user",
    "category": "appointments",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/dashboard/data/appointments",
    "action": "dashboard:data:appointments:read",
    "resourceType": "dashboard:data:appointments",
    "category": "dashboard",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/dashboard/data/course",
    "action": "dashboard:data:course:read",
    "resourceType": "dashboard:data:course",
    "category": "dashboard",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/dashboard/data/platoon",
    "action": "dashboard:data:platoon:read",
    "resourceType": "dashboard:data:platoon",
    "category": "dashboard",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/health",
    "action": "health:read",
    "resourceType": "health",
    "category": "health",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/me",
    "action": "me:read",
    "resourceType": "me",
    "category": "me",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/me/device-site-settings",
    "action": "me:device-site-settings:read",
    "resourceType": "me:device-site-settings",
    "category": "me",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc",
    "action": "oc:read",
    "resourceType": "oc",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId",
    "action": "oc:read",
    "resourceType": "oc",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/academics",
    "action": "oc:academics:read",
    "resourceType": "oc:academics",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/academics/:semester",
    "action": "oc:academics:read",
    "resourceType": "oc:academics",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/achievements",
    "action": "oc:achievements:read",
    "resourceType": "oc:achievements",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/achievements/:id",
    "action": "oc:achievements:read",
    "resourceType": "oc:achievements",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/autobiography",
    "action": "oc:autobiography:read",
    "resourceType": "oc:autobiography",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/camps",
    "action": "oc:camps:read",
    "resourceType": "oc:camps",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/club-achievements",
    "action": "oc:club-achievements:read",
    "resourceType": "oc:club-achievements",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/club-achievements/:id",
    "action": "oc:club-achievements:read",
    "resourceType": "oc:club-achievements",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/clubs",
    "action": "oc:clubs:read",
    "resourceType": "oc:clubs",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/clubs/:id",
    "action": "oc:clubs:read",
    "resourceType": "oc:clubs",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/counselling",
    "action": "oc:counselling:read",
    "resourceType": "oc:counselling",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/counselling/:id",
    "action": "oc:counselling:read",
    "resourceType": "oc:counselling",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/credit-for-excellence",
    "action": "oc:credit-for-excellence:read",
    "resourceType": "oc:credit-for-excellence",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/credit-for-excellence/:id",
    "action": "oc:credit-for-excellence:read",
    "resourceType": "oc:credit-for-excellence",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/discipline",
    "action": "oc:discipline:read",
    "resourceType": "oc:discipline",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/discipline/:id",
    "action": "oc:discipline:read",
    "resourceType": "oc:discipline",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/dossier-filling",
    "action": "oc:dossier-filling:read",
    "resourceType": "oc:dossier-filling",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/dossier-inspection",
    "action": "oc:dossier-inspection:read",
    "resourceType": "oc:dossier-inspection",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/dossier-snapshot",
    "action": "oc:dossier-snapshot:read",
    "resourceType": "oc:dossier-snapshot",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/drill",
    "action": "oc:drill:read",
    "resourceType": "oc:drill",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/drill/:id",
    "action": "oc:drill:read",
    "resourceType": "oc:drill",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/education",
    "action": "oc:education:read",
    "resourceType": "oc:education",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/education/:id",
    "action": "oc:education:read",
    "resourceType": "oc:education",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/family",
    "action": "oc:family:read",
    "resourceType": "oc:family",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/family/:id",
    "action": "oc:family:read",
    "resourceType": "oc:family",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/fpr",
    "action": "oc:fpr:read",
    "resourceType": "oc:fpr",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/images",
    "action": "oc:images:read",
    "resourceType": "oc:images",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/interviews",
    "action": "oc:interviews:read",
    "resourceType": "oc:interviews",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/interviews/:interviewId",
    "action": "oc:interviews:read",
    "resourceType": "oc:interviews",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/medical",
    "action": "oc:medical:read",
    "resourceType": "oc:medical",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/medical-category",
    "action": "oc:medical-category:read",
    "resourceType": "oc:medical-category",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/medical-category/:id",
    "action": "oc:medical-category:read",
    "resourceType": "oc:medical-category",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/medical/:id",
    "action": "oc:medical:read",
    "resourceType": "oc:medical",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/motivation-awards",
    "action": "oc:motivation-awards:read",
    "resourceType": "oc:motivation-awards",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/motivation-awards/:id",
    "action": "oc:motivation-awards:read",
    "resourceType": "oc:motivation-awards",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/obstacle-training",
    "action": "oc:obstacle-training:read",
    "resourceType": "oc:obstacle-training",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/obstacle-training/:id",
    "action": "oc:obstacle-training:read",
    "resourceType": "oc:obstacle-training",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/olq",
    "action": "oc:olq:read",
    "resourceType": "oc:olq",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/olq/:id",
    "action": "oc:olq:read",
    "resourceType": "oc:olq",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/olq/by-semester",
    "action": "oc:olq:by-semester:read",
    "resourceType": "oc:olq:by-semester",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/olq/categories",
    "action": "oc:olq:categories:read",
    "resourceType": "oc:olq:categories",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/olq/categories/:categoryId",
    "action": "oc:olq:categories:read",
    "resourceType": "oc:olq:categories",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/olq/subtitles",
    "action": "oc:olq:subtitles:read",
    "resourceType": "oc:olq:subtitles",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/olq/subtitles/:subtitleId",
    "action": "oc:olq:subtitles:read",
    "resourceType": "oc:olq:subtitles",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/parent-comms",
    "action": "oc:parent-comms:read",
    "resourceType": "oc:parent-comms",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/parent-comms/:id",
    "action": "oc:parent-comms:read",
    "resourceType": "oc:parent-comms",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/personal",
    "action": "oc:personal:read",
    "resourceType": "oc:personal",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/physical-training",
    "action": "oc:physical-training:read",
    "resourceType": "oc:physical-training",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/physical-training/motivation-awards",
    "action": "oc:physical-training:motivation-awards:read",
    "resourceType": "oc:physical-training:motivation-awards",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/recording-leave-hike-detention",
    "action": "oc:recording-leave-hike-detention:read",
    "resourceType": "oc:recording-leave-hike-detention",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/recording-leave-hike-detention/:id",
    "action": "oc:recording-leave-hike-detention:read",
    "resourceType": "oc:recording-leave-hike-detention",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/special-achievement-in-firing",
    "action": "oc:special-achievement-in-firing:read",
    "resourceType": "oc:special-achievement-in-firing",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/special-achievement-in-firing/:id",
    "action": "oc:special-achievement-in-firing:read",
    "resourceType": "oc:special-achievement-in-firing",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/speed-march",
    "action": "oc:speed-march:read",
    "resourceType": "oc:speed-march",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/speed-march/:id",
    "action": "oc:speed-march:read",
    "resourceType": "oc:speed-march",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/sports-and-games",
    "action": "oc:sports-and-games:read",
    "resourceType": "oc:sports-and-games",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/sports-and-games/:id",
    "action": "oc:sports-and-games:read",
    "resourceType": "oc:sports-and-games",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/spr",
    "action": "oc:spr:read",
    "resourceType": "oc:spr",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/ssb",
    "action": "oc:ssb:read",
    "resourceType": "oc:ssb",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/ssb/points",
    "action": "oc:ssb:points:read",
    "resourceType": "oc:ssb:points",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/ssb/points/:id",
    "action": "oc:ssb:points:read",
    "resourceType": "oc:ssb:points",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/weapon-training",
    "action": "oc:weapon-training:read",
    "resourceType": "oc:weapon-training",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/:ocId/weapon-training/:id",
    "action": "oc:weapon-training:read",
    "resourceType": "oc:weapon-training",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/oc/academics/bulk",
    "action": "oc:academics:bulk:read",
    "resourceType": "oc:academics:bulk",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/platoons",
    "action": "platoons:read",
    "resourceType": "platoons",
    "category": "platoons",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/roles",
    "action": "roles:read",
    "resourceType": "roles",
    "category": "roles",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/settings/device-site",
    "action": "settings:device-site:read",
    "resourceType": "settings:device-site",
    "category": "settings",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/site-settings",
    "action": "site-settings:read",
    "resourceType": "site-settings",
    "category": "site-settings",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/site-settings/awards",
    "action": "site-settings:awards:read",
    "resourceType": "site-settings:awards",
    "category": "site-settings",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/site-settings/commanders",
    "action": "site-settings:commanders:read",
    "resourceType": "site-settings:commanders",
    "category": "site-settings",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "GET",
    "path": "/api/v1/site-settings/history",
    "action": "site-settings:history:read",
    "resourceType": "site-settings:history",
    "category": "site-settings",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "OPTIONS",
    "path": "/api/v1/auth/logout",
    "action": "auth:logout:read",
    "resourceType": "auth:logout",
    "category": "auth",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/appointments/:id",
    "action": "admin:appointments:update",
    "resourceType": "admin:appointments",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/courses/:courseId",
    "action": "admin:courses:update",
    "resourceType": "admin:courses",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/courses/:courseId/offerings/:offeringId",
    "action": "admin:courses:offerings:update",
    "resourceType": "admin:courses:offerings",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/discipline/:id",
    "action": "admin:discipline:update",
    "resourceType": "admin:discipline",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/instructors/:id",
    "action": "admin:instructors:update",
    "resourceType": "admin:instructors",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/interview/templates/:templateId",
    "action": "admin:interview:templates:update",
    "resourceType": "admin:interview:templates",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/interview/templates/:templateId/fields/:fieldId",
    "action": "admin:interview:templates:fields:update",
    "resourceType": "admin:interview:templates:fields",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/interview/templates/:templateId/fields/:fieldId/options/:optionId",
    "action": "admin:interview:templates:fields:options:update",
    "resourceType": "admin:interview:templates:fields:options",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/interview/templates/:templateId/groups/:groupId",
    "action": "admin:interview:templates:groups:update",
    "resourceType": "admin:interview:templates:groups",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/interview/templates/:templateId/sections/:sectionId",
    "action": "admin:interview:templates:sections:update",
    "resourceType": "admin:interview:templates:sections",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/physical-training/motivation-fields/:id",
    "action": "admin:physical-training:motivation-fields:update",
    "resourceType": "admin:physical-training:motivation-fields",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/physical-training/types/:typeId",
    "action": "admin:physical-training:types:update",
    "resourceType": "admin:physical-training:types",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/physical-training/types/:typeId/attempts/:attemptId",
    "action": "admin:physical-training:types:attempts:update",
    "resourceType": "admin:physical-training:types:attempts",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/physical-training/types/:typeId/attempts/:attemptId/grades/:gradeId",
    "action": "admin:physical-training:types:attempts:grades:update",
    "resourceType": "admin:physical-training:types:attempts:grades",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/physical-training/types/:typeId/tasks/:taskId",
    "action": "admin:physical-training:types:tasks:update",
    "resourceType": "admin:physical-training:types:tasks",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/physical-training/types/:typeId/tasks/:taskId/scores/:scoreId",
    "action": "admin:physical-training:types:tasks:scores:update",
    "resourceType": "admin:physical-training:types:tasks:scores",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/positions/:id",
    "action": "admin:positions:update",
    "resourceType": "admin:positions",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/punishments/:id",
    "action": "admin:punishments:update",
    "resourceType": "admin:punishments",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/rbac/field-rules/:ruleId",
    "action": "admin:rbac:field-rules:update",
    "resourceType": "admin:rbac:field-rules",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/rbac/permissions/:permissionId",
    "action": "admin:rbac:permissions:update",
    "resourceType": "admin:rbac:permissions",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/rbac/roles/:roleId",
    "action": "admin:rbac:roles:update",
    "resourceType": "admin:rbac:roles",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/site-settings/awards/reorder",
    "action": "admin:site-settings:awards:reorder:update",
    "resourceType": "admin:site-settings:awards:reorder",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/subjects/:id",
    "action": "admin:subjects:update",
    "resourceType": "admin:subjects",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/training-camps/:campId",
    "action": "admin:training-camps:update",
    "resourceType": "admin:training-camps",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/training-camps/:campId/activities/:activityId",
    "action": "admin:training-camps:activities:update",
    "resourceType": "admin:training-camps:activities",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/users/:id",
    "action": "admin:users:update",
    "resourceType": "admin:users",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId",
    "action": "oc:update",
    "resourceType": "oc",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/academics/:semester",
    "action": "oc:academics:update",
    "resourceType": "oc:academics",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/academics/:semester/subjects/:subjectId",
    "action": "oc:academics:subjects:update",
    "resourceType": "oc:academics:subjects",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/achievements/:id",
    "action": "oc:achievements:update",
    "resourceType": "oc:achievements",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/autobiography",
    "action": "oc:autobiography:update",
    "resourceType": "oc:autobiography",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/club-achievements/:id",
    "action": "oc:club-achievements:update",
    "resourceType": "oc:club-achievements",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/clubs/:id",
    "action": "oc:clubs:update",
    "resourceType": "oc:clubs",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/counselling/:id",
    "action": "oc:counselling:update",
    "resourceType": "oc:counselling",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/credit-for-excellence/:id",
    "action": "oc:credit-for-excellence:update",
    "resourceType": "oc:credit-for-excellence",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/discipline/:id",
    "action": "oc:discipline:update",
    "resourceType": "oc:discipline",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/dossier-filling",
    "action": "oc:dossier-filling:update",
    "resourceType": "oc:dossier-filling",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/dossier-inspection",
    "action": "oc:dossier-inspection:update",
    "resourceType": "oc:dossier-inspection",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/dossier-snapshot",
    "action": "oc:dossier-snapshot:update",
    "resourceType": "oc:dossier-snapshot",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/drill/:id",
    "action": "oc:drill:update",
    "resourceType": "oc:drill",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/education/:id",
    "action": "oc:education:update",
    "resourceType": "oc:education",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/family/:id",
    "action": "oc:family:update",
    "resourceType": "oc:family",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/interviews/:interviewId",
    "action": "oc:interviews:update",
    "resourceType": "oc:interviews",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/medical-category/:id",
    "action": "oc:medical-category:update",
    "resourceType": "oc:medical-category",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/medical/:id",
    "action": "oc:medical:update",
    "resourceType": "oc:medical",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/motivation-awards/:id",
    "action": "oc:motivation-awards:update",
    "resourceType": "oc:motivation-awards",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/obstacle-training/:id",
    "action": "oc:obstacle-training:update",
    "resourceType": "oc:obstacle-training",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/olq",
    "action": "oc:olq:update",
    "resourceType": "oc:olq",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/olq/categories/:categoryId",
    "action": "oc:olq:categories:update",
    "resourceType": "oc:olq:categories",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/olq/subtitles/:subtitleId",
    "action": "oc:olq:subtitles:update",
    "resourceType": "oc:olq:subtitles",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/parent-comms/:id",
    "action": "oc:parent-comms:update",
    "resourceType": "oc:parent-comms",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/personal",
    "action": "oc:personal:update",
    "resourceType": "oc:personal",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/physical-training",
    "action": "oc:physical-training:update",
    "resourceType": "oc:physical-training",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/physical-training/motivation-awards",
    "action": "oc:physical-training:motivation-awards:update",
    "resourceType": "oc:physical-training:motivation-awards",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/recording-leave-hike-detention/:id",
    "action": "oc:recording-leave-hike-detention:update",
    "resourceType": "oc:recording-leave-hike-detention",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/special-achievement-in-firing/:id",
    "action": "oc:special-achievement-in-firing:update",
    "resourceType": "oc:special-achievement-in-firing",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/speed-march/:id",
    "action": "oc:speed-march:update",
    "resourceType": "oc:speed-march",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/sports-and-games/:id",
    "action": "oc:sports-and-games:update",
    "resourceType": "oc:sports-and-games",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/spr",
    "action": "oc:spr:update",
    "resourceType": "oc:spr",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/ssb",
    "action": "oc:ssb:update",
    "resourceType": "oc:ssb",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/ssb/points/:id",
    "action": "oc:ssb:points:update",
    "resourceType": "oc:ssb:points",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/oc/:ocId/weapon-training/:id",
    "action": "oc:weapon-training:update",
    "resourceType": "oc:weapon-training",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PATCH",
    "path": "/api/v1/platoons/:idOrKey",
    "action": "platoons:update",
    "resourceType": "platoons",
    "category": "platoons",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/appointments",
    "action": "admin:appointments:create",
    "resourceType": "admin:appointments",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/appointments/:id/transfer",
    "action": "admin:appointments:transfer:create",
    "resourceType": "admin:appointments:transfer",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/courses",
    "action": "admin:courses:create",
    "resourceType": "admin:courses",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/courses/:courseId/offerings",
    "action": "admin:courses:offerings:create",
    "resourceType": "admin:courses:offerings",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/courses/:courseId/offerings/assign",
    "action": "admin:courses:offerings:assign:create",
    "resourceType": "admin:courses:offerings:assign",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/instructors",
    "action": "admin:instructors:create",
    "resourceType": "admin:instructors",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/interview/templates",
    "action": "admin:interview:templates:create",
    "resourceType": "admin:interview:templates",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/interview/templates/:templateId/fields/:fieldId/options",
    "action": "admin:interview:templates:fields:options:create",
    "resourceType": "admin:interview:templates:fields:options",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/interview/templates/:templateId/groups",
    "action": "admin:interview:templates:groups:create",
    "resourceType": "admin:interview:templates:groups",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/interview/templates/:templateId/groups/:groupId/fields",
    "action": "admin:interview:templates:groups:fields:create",
    "resourceType": "admin:interview:templates:groups:fields",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/interview/templates/:templateId/sections",
    "action": "admin:interview:templates:sections:create",
    "resourceType": "admin:interview:templates:sections",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/interview/templates/:templateId/sections/:sectionId/fields",
    "action": "admin:interview:templates:sections:fields:create",
    "resourceType": "admin:interview:templates:sections:fields",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/interview/templates/:templateId/semesters",
    "action": "admin:interview:templates:semesters:create",
    "resourceType": "admin:interview:templates:semesters",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/physical-training/motivation-fields",
    "action": "admin:physical-training:motivation-fields:create",
    "resourceType": "admin:physical-training:motivation-fields",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/physical-training/types",
    "action": "admin:physical-training:types:create",
    "resourceType": "admin:physical-training:types",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/physical-training/types/:typeId/attempts",
    "action": "admin:physical-training:types:attempts:create",
    "resourceType": "admin:physical-training:types:attempts",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/physical-training/types/:typeId/attempts/:attemptId/grades",
    "action": "admin:physical-training:types:attempts:grades:create",
    "resourceType": "admin:physical-training:types:attempts:grades",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/physical-training/types/:typeId/tasks",
    "action": "admin:physical-training:types:tasks:create",
    "resourceType": "admin:physical-training:types:tasks",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/physical-training/types/:typeId/tasks/:taskId/scores",
    "action": "admin:physical-training:types:tasks:scores:create",
    "resourceType": "admin:physical-training:types:tasks:scores",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/positions",
    "action": "admin:positions:create",
    "resourceType": "admin:positions",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/punishments",
    "action": "admin:punishments:create",
    "resourceType": "admin:punishments",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/relegation/presign",
    "action": "admin:relegation:presign:create",
    "resourceType": "admin:relegation:presign",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/relegation/transfer",
    "action": "admin:relegation:transfer:create",
    "resourceType": "admin:relegation:transfer",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/rbac/field-rules",
    "action": "admin:rbac:field-rules:create",
    "resourceType": "admin:rbac:field-rules",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/rbac/permissions",
    "action": "admin:rbac:permissions:create",
    "resourceType": "admin:rbac:permissions",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/rbac/roles",
    "action": "admin:rbac:roles:create",
    "resourceType": "admin:rbac:roles",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/signup-requests/:id/approve",
    "action": "admin:signup-requests:approve:create",
    "resourceType": "admin:signup-requests:approve",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/signup-requests/:id/reject",
    "action": "admin:signup-requests:reject:create",
    "resourceType": "admin:signup-requests:reject",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/site-settings/awards",
    "action": "admin:site-settings:awards:create",
    "resourceType": "admin:site-settings:awards",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/site-settings/commanders",
    "action": "admin:site-settings:commanders:create",
    "resourceType": "admin:site-settings:commanders",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/site-settings/history",
    "action": "admin:site-settings:history:create",
    "resourceType": "admin:site-settings:history",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/site-settings/logo/presign",
    "action": "admin:site-settings:logo:presign:create",
    "resourceType": "admin:site-settings:logo:presign",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/subjects",
    "action": "admin:subjects:create",
    "resourceType": "admin:subjects",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/training-camps",
    "action": "admin:training-camps:create",
    "resourceType": "admin:training-camps",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/training-camps/:campId/activities",
    "action": "admin:training-camps:activities:create",
    "resourceType": "admin:training-camps:activities",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/users",
    "action": "admin:users:create",
    "resourceType": "admin:users",
    "category": "admin",
    "fieldLevelCandidate": false,
    "adminBaseline": true
  },
  {
    "method": "POST",
    "path": "/api/v1/auth/change-password",
    "action": "auth:change-password:create",
    "resourceType": "auth:change-password",
    "category": "auth",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/auth/login",
    "action": "auth:login:create",
    "resourceType": "auth:login",
    "category": "auth",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/auth/logout",
    "action": "auth:logout:create",
    "resourceType": "auth:logout",
    "category": "auth",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/auth/signup",
    "action": "auth:signup:create",
    "resourceType": "auth:signup",
    "category": "auth",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/bootstrap/super-admin",
    "action": "bootstrap:super-admin:create",
    "resourceType": "bootstrap:super-admin",
    "category": "bootstrap",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc",
    "action": "oc:create",
    "resourceType": "oc",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/achievements",
    "action": "oc:achievements:create",
    "resourceType": "oc:achievements",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/autobiography",
    "action": "oc:autobiography:create",
    "resourceType": "oc:autobiography",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/camps",
    "action": "oc:camps:create",
    "resourceType": "oc:camps",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/club-achievements",
    "action": "oc:club-achievements:create",
    "resourceType": "oc:club-achievements",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/clubs",
    "action": "oc:clubs:create",
    "resourceType": "oc:clubs",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/counselling",
    "action": "oc:counselling:create",
    "resourceType": "oc:counselling",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/credit-for-excellence",
    "action": "oc:credit-for-excellence:create",
    "resourceType": "oc:credit-for-excellence",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/discipline",
    "action": "oc:discipline:create",
    "resourceType": "oc:discipline",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/dossier-filling",
    "action": "oc:dossier-filling:create",
    "resourceType": "oc:dossier-filling",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/dossier-inspection",
    "action": "oc:dossier-inspection:create",
    "resourceType": "oc:dossier-inspection",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/dossier-snapshot",
    "action": "oc:dossier-snapshot:create",
    "resourceType": "oc:dossier-snapshot",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/drill",
    "action": "oc:drill:create",
    "resourceType": "oc:drill",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/education",
    "action": "oc:education:create",
    "resourceType": "oc:education",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/family",
    "action": "oc:family:create",
    "resourceType": "oc:family",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/images/complete",
    "action": "oc:images:complete:create",
    "resourceType": "oc:images:complete",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/images/presign",
    "action": "oc:images:presign:create",
    "resourceType": "oc:images:presign",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/interviews",
    "action": "oc:interviews:create",
    "resourceType": "oc:interviews",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/medical",
    "action": "oc:medical:create",
    "resourceType": "oc:medical",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/medical-category",
    "action": "oc:medical-category:create",
    "resourceType": "oc:medical-category",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/motivation-awards",
    "action": "oc:motivation-awards:create",
    "resourceType": "oc:motivation-awards",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/obstacle-training",
    "action": "oc:obstacle-training:create",
    "resourceType": "oc:obstacle-training",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/olq",
    "action": "oc:olq:create",
    "resourceType": "oc:olq",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/olq/categories",
    "action": "oc:olq:categories:create",
    "resourceType": "oc:olq:categories",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/olq/subtitles",
    "action": "oc:olq:subtitles:create",
    "resourceType": "oc:olq:subtitles",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/parent-comms",
    "action": "oc:parent-comms:create",
    "resourceType": "oc:parent-comms",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/personal",
    "action": "oc:personal:create",
    "resourceType": "oc:personal",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/physical-training",
    "action": "oc:physical-training:create",
    "resourceType": "oc:physical-training",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/physical-training/motivation-awards",
    "action": "oc:physical-training:motivation-awards:create",
    "resourceType": "oc:physical-training:motivation-awards",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/recording-leave-hike-detention",
    "action": "oc:recording-leave-hike-detention:create",
    "resourceType": "oc:recording-leave-hike-detention",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/special-achievement-in-firing",
    "action": "oc:special-achievement-in-firing:create",
    "resourceType": "oc:special-achievement-in-firing",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/speed-march",
    "action": "oc:speed-march:create",
    "resourceType": "oc:speed-march",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/sports-and-games",
    "action": "oc:sports-and-games:create",
    "resourceType": "oc:sports-and-games",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/spr",
    "action": "oc:spr:create",
    "resourceType": "oc:spr",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/ssb",
    "action": "oc:ssb:create",
    "resourceType": "oc:ssb",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/ssb/points",
    "action": "oc:ssb:points:create",
    "resourceType": "oc:ssb:points",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/:ocId/weapon-training",
    "action": "oc:weapon-training:create",
    "resourceType": "oc:weapon-training",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/academics/bulk",
    "action": "oc:academics:bulk:create",
    "resourceType": "oc:academics:bulk",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/oc/bulk-upload",
    "action": "oc:bulk-upload:create",
    "resourceType": "oc:bulk-upload",
    "category": "oc",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/platoons",
    "action": "platoons:create",
    "resourceType": "platoons",
    "category": "platoons",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "POST",
    "path": "/api/v1/roles",
    "action": "roles:create",
    "resourceType": "roles",
    "category": "roles",
    "fieldLevelCandidate": false,
    "adminBaseline": false
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/device-site-settings",
    "action": "admin:device-site-settings:update",
    "resourceType": "admin:device-site-settings",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/rbac/mappings",
    "action": "admin:rbac:mappings:update",
    "resourceType": "admin:rbac:mappings",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/site-settings",
    "action": "admin:site-settings:update",
    "resourceType": "admin:site-settings",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/site-settings/awards/:id",
    "action": "admin:site-settings:awards:update",
    "resourceType": "admin:site-settings:awards",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/site-settings/commanders/:id",
    "action": "admin:site-settings:commanders:update",
    "resourceType": "admin:site-settings:commanders",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/site-settings/history/:id",
    "action": "admin:site-settings:history:update",
    "resourceType": "admin:site-settings:history",
    "category": "admin",
    "fieldLevelCandidate": true,
    "adminBaseline": true
  },
  {
    "method": "PUT",
    "path": "/api/v1/oc/:ocId/camps",
    "action": "oc:camps:update",
    "resourceType": "oc:camps",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PUT",
    "path": "/api/v1/oc/:ocId/dossier-snapshot",
    "action": "oc:dossier-snapshot:update",
    "resourceType": "oc:dossier-snapshot",
    "category": "oc",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  },
  {
    "method": "PUT",
    "path": "/api/v1/settings/device-site",
    "action": "settings:device-site:update",
    "resourceType": "settings:device-site",
    "category": "settings",
    "fieldLevelCandidate": true,
    "adminBaseline": false
  }
]

export const PAGE_ACTION_MAP: PageActionEntry[] = [
  {
    "route": "/dashboard",
    "action": "page:dashboard:view",
    "resourceType": "page:dashboard",
    "category": "dashboard",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt",
    "action": "page:dashboard:milmgmt:view",
    "resourceType": "page:dashboard:milmgmt",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/academics",
    "action": "page:dashboard:milmgmt:academics:view",
    "resourceType": "page:dashboard:milmgmt:academics",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/background-detls",
    "action": "page:dashboard:milmgmt:background-detls:view",
    "resourceType": "page:dashboard:milmgmt:background-detls",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/camps",
    "action": "page:dashboard:milmgmt:camps:view",
    "resourceType": "page:dashboard:milmgmt:camps",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/club-detls",
    "action": "page:dashboard:milmgmt:club-detls:view",
    "resourceType": "page:dashboard:milmgmt:club-detls",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/comn-parents",
    "action": "page:dashboard:milmgmt:comn-parents:view",
    "resourceType": "page:dashboard:milmgmt:comn-parents",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/counselling",
    "action": "page:dashboard:milmgmt:counselling:view",
    "resourceType": "page:dashboard:milmgmt:counselling",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/credit-excellence",
    "action": "page:dashboard:milmgmt:credit-excellence:view",
    "resourceType": "page:dashboard:milmgmt:credit-excellence",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/detention",
    "action": "page:dashboard:milmgmt:detention:view",
    "resourceType": "page:dashboard:milmgmt:detention",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/discip-records",
    "action": "page:dashboard:milmgmt:discip-records:view",
    "resourceType": "page:dashboard:milmgmt:discip-records",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/dossier-filling",
    "action": "page:dashboard:milmgmt:dossier-filling:view",
    "resourceType": "page:dashboard:milmgmt:dossier-filling",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/dossier-insp",
    "action": "page:dashboard:milmgmt:dossier-insp:view",
    "resourceType": "page:dashboard:milmgmt:dossier-insp",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/dossier-snapshot",
    "action": "page:dashboard:milmgmt:dossier-snapshot:view",
    "resourceType": "page:dashboard:milmgmt:dossier-snapshot",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/final-performance",
    "action": "page:dashboard:milmgmt:final-performance:view",
    "resourceType": "page:dashboard:milmgmt:final-performance",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/hikes",
    "action": "page:dashboard:milmgmt:hikes:view",
    "resourceType": "page:dashboard:milmgmt:hikes",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/initial-interview",
    "action": "page:dashboard:milmgmt:initial-interview:view",
    "resourceType": "page:dashboard:milmgmt:initial-interview",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/interview-term",
    "action": "page:dashboard:milmgmt:interview-term:view",
    "resourceType": "page:dashboard:milmgmt:interview-term",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/leave-record",
    "action": "page:dashboard:milmgmt:leave-record:view",
    "resourceType": "page:dashboard:milmgmt:leave-record",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/med-record",
    "action": "page:dashboard:milmgmt:med-record:view",
    "resourceType": "page:dashboard:milmgmt:med-record",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/obstacle-trg",
    "action": "page:dashboard:milmgmt:obstacle-trg:view",
    "resourceType": "page:dashboard:milmgmt:obstacle-trg",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/olq-assessment",
    "action": "page:dashboard:milmgmt:olq-assessment:view",
    "resourceType": "page:dashboard:milmgmt:olq-assessment",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/overall-assessment",
    "action": "page:dashboard:milmgmt:overall-assessment:view",
    "resourceType": "page:dashboard:milmgmt:overall-assessment",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/performance-graph",
    "action": "page:dashboard:milmgmt:performance-graph:view",
    "resourceType": "page:dashboard:milmgmt:performance-graph",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/pers-particulars",
    "action": "page:dashboard:milmgmt:pers-particulars:view",
    "resourceType": "page:dashboard:milmgmt:pers-particulars",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/physical-training",
    "action": "page:dashboard:milmgmt:physical-training:view",
    "resourceType": "page:dashboard:milmgmt:physical-training",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/semester-record",
    "action": "page:dashboard:milmgmt:semester-record:view",
    "resourceType": "page:dashboard:milmgmt:semester-record",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/speed-march",
    "action": "page:dashboard:milmgmt:speed-march:view",
    "resourceType": "page:dashboard:milmgmt:speed-march",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/sports-awards",
    "action": "page:dashboard:milmgmt:sports-awards:view",
    "resourceType": "page:dashboard:milmgmt:sports-awards",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/ssb-reports",
    "action": "page:dashboard:milmgmt:ssb-reports:view",
    "resourceType": "page:dashboard:milmgmt:ssb-reports",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/:id/milmgmt/wpn-trg",
    "action": "page:dashboard:milmgmt:wpn-trg:view",
    "resourceType": "page:dashboard:milmgmt:wpn-trg",
    "category": ":id",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/audit-logs",
    "action": "page:dashboard:audit-logs:view",
    "resourceType": "page:dashboard:audit-logs",
    "category": "audit-logs",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/genmgmt",
    "action": "page:dashboard:genmgmt:view",
    "resourceType": "page:dashboard:genmgmt",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/appointmentmgmt",
    "action": "page:dashboard:genmgmt:appointmentmgmt:view",
    "resourceType": "page:dashboard:genmgmt:appointmentmgmt",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/approvalmgmt",
    "action": "page:dashboard:genmgmt:approvalmgmt:view",
    "resourceType": "page:dashboard:genmgmt:approvalmgmt",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/camps",
    "action": "page:dashboard:genmgmt:camps:view",
    "resourceType": "page:dashboard:genmgmt:camps",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/coursemgmt",
    "action": "page:dashboard:genmgmt:coursemgmt:view",
    "resourceType": "page:dashboard:genmgmt:coursemgmt",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/coursemgmt/:courseId/offerings",
    "action": "page:dashboard:genmgmt:coursemgmt:offerings:view",
    "resourceType": "page:dashboard:genmgmt:coursemgmt:offerings",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/discipline-records",
    "action": "page:dashboard:genmgmt:discipline-records:view",
    "resourceType": "page:dashboard:genmgmt:discipline-records",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/instructors",
    "action": "page:dashboard:genmgmt:instructors:view",
    "resourceType": "page:dashboard:genmgmt:instructors",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/interviews-mgmt",
    "action": "page:dashboard:genmgmt:interviews-mgmt:view",
    "resourceType": "page:dashboard:genmgmt:interviews-mgmt",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/interviews-mgmt/:id",
    "action": "page:dashboard:genmgmt:interviews-mgmt:view",
    "resourceType": "page:dashboard:genmgmt:interviews-mgmt",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/ocmgmt",
    "action": "page:dashboard:genmgmt:ocmgmt:view",
    "resourceType": "page:dashboard:genmgmt:ocmgmt",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/platoon-management",
    "action": "page:dashboard:genmgmt:platoon-management:view",
    "resourceType": "page:dashboard:genmgmt:platoon-management",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/pt-mgmt",
    "action": "page:dashboard:genmgmt:pt-mgmt:view",
    "resourceType": "page:dashboard:genmgmt:pt-mgmt",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/punishments",
    "action": "page:dashboard:genmgmt:punishments:view",
    "resourceType": "page:dashboard:genmgmt:punishments",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/rbac",
    "action": "page:dashboard:genmgmt:rbac:view",
    "resourceType": "page:dashboard:genmgmt:rbac",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/relegation",
    "action": "page:dashboard:genmgmt:relegation:view",
    "resourceType": "page:dashboard:genmgmt:relegation",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/settings/site",
    "action": "page:dashboard:genmgmt:settings:site:view",
    "resourceType": "page:dashboard:genmgmt:settings:site",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/subjectmgmt",
    "action": "page:dashboard:genmgmt:subjectmgmt:view",
    "resourceType": "page:dashboard:genmgmt:subjectmgmt",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/genmgmt/usersmgmt",
    "action": "page:dashboard:genmgmt:usersmgmt:view",
    "resourceType": "page:dashboard:genmgmt:usersmgmt",
    "category": "genmgmt",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/manage-marks",
    "action": "page:dashboard:manage-marks:view",
    "resourceType": "page:dashboard:manage-marks",
    "category": "manage-marks",
    "adminBaseline": true
  },
  {
    "route": "/dashboard/reports",
    "action": "page:dashboard:reports:view",
    "resourceType": "page:dashboard:reports",
    "category": "reports",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/settings",
    "action": "page:dashboard:settings:view",
    "resourceType": "page:dashboard:settings",
    "category": "settings",
    "adminBaseline": false
  },
  {
    "route": "/dashboard/settings/device",
    "action": "page:dashboard:settings:device:view",
    "resourceType": "page:dashboard:settings:device",
    "category": "settings",
    "adminBaseline": false
  }
]

function templateToRegExp(pathTemplate: string): RegExp {
  const escaped = Array.from(pathTemplate)
    .map((ch) => ('.+*?^$()[]{}|\\'.includes(ch) ? '\\' + ch : ch))
    .join('');
  const withSplat = escaped.replace(/:[A-Za-z0-9_]+\*/g, '.+');
  const withParams = withSplat.replace(/:[A-Za-z0-9_]+/g, '[^/]+');
  return new RegExp('^' + withParams + '$');
}

const API_ACTION_INDEX = API_ACTION_MAP.map((entry) => ({
  ...entry,
  pattern: templateToRegExp(entry.path),
}));

const PAGE_ACTION_INDEX = PAGE_ACTION_MAP.map((entry) => ({
  ...entry,
  pattern: templateToRegExp(entry.route),
}));

export function resolveApiAction(method: string, pathname: string): ApiActionEntry | null {
  const upperMethod = method.toUpperCase() as HttpMethod;
  for (const entry of API_ACTION_INDEX) {
    if (entry.method !== upperMethod) continue;
    if (entry.pattern.test(pathname)) return entry;
  }
  return null;
}

export function resolvePageAction(pathname: string): PageActionEntry | null {
  for (const entry of PAGE_ACTION_INDEX) {
    if (entry.pattern.test(pathname)) return entry;
  }
  return null;
}
