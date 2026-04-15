import path from 'node:path';
import {
  discoverDirectApiCoverageFromTests,
  expandRouteFilesToMethods,
  toPosix,
  type ApiCoverageGroup,
} from '../../scripts/lib/api-route-inventory';

export const ADMIN_UNCOVERED_ROUTE_FILES = [
  'src/app/api/v1/admin/academics/grading-policy/recalculate/route.ts',
  'src/app/api/v1/admin/academics/grading-policy/route.ts',
  'src/app/api/v1/admin/appointments/[id]/route.ts',
  'src/app/api/v1/admin/appointments/[id]/transfer/route.ts',
  'src/app/api/v1/admin/audit-logs/route.ts',
  'src/app/api/v1/admin/discipline/[id]/route.ts',
  'src/app/api/v1/admin/discipline/route.ts',
  'src/app/api/v1/admin/interview/pending/route.ts',
  'src/app/api/v1/admin/interview/templates/[templateId]/fields/[fieldId]/options/[optionId]/route.ts',
  'src/app/api/v1/admin/interview/templates/[templateId]/fields/[fieldId]/options/route.ts',
  'src/app/api/v1/admin/interview/templates/[templateId]/fields/[fieldId]/route.ts',
  'src/app/api/v1/admin/interview/templates/[templateId]/groups/[groupId]/fields/route.ts',
  'src/app/api/v1/admin/interview/templates/[templateId]/groups/[groupId]/route.ts',
  'src/app/api/v1/admin/interview/templates/[templateId]/groups/route.ts',
  'src/app/api/v1/admin/interview/templates/[templateId]/route.ts',
  'src/app/api/v1/admin/interview/templates/[templateId]/sections/[sectionId]/fields/route.ts',
  'src/app/api/v1/admin/interview/templates/[templateId]/sections/[sectionId]/route.ts',
  'src/app/api/v1/admin/interview/templates/[templateId]/sections/route.ts',
  'src/app/api/v1/admin/interview/templates/[templateId]/semesters/[semester]/route.ts',
  'src/app/api/v1/admin/interview/templates/[templateId]/semesters/route.ts',
  'src/app/api/v1/admin/physical-training/motivation-fields/[id]/route.ts',
  'src/app/api/v1/admin/physical-training/motivation-fields/route.ts',
  'src/app/api/v1/admin/physical-training/templates/route.ts',
  'src/app/api/v1/admin/physical-training/types/[typeId]/attempts/[attemptId]/grades/[gradeId]/route.ts',
  'src/app/api/v1/admin/physical-training/types/[typeId]/attempts/[attemptId]/grades/route.ts',
  'src/app/api/v1/admin/physical-training/types/[typeId]/attempts/[attemptId]/route.ts',
  'src/app/api/v1/admin/physical-training/types/[typeId]/attempts/route.ts',
  'src/app/api/v1/admin/physical-training/types/[typeId]/route.ts',
  'src/app/api/v1/admin/physical-training/types/[typeId]/tasks/[taskId]/route.ts',
  'src/app/api/v1/admin/physical-training/types/[typeId]/tasks/[taskId]/scores/[scoreId]/route.ts',
  'src/app/api/v1/admin/physical-training/types/[typeId]/tasks/[taskId]/scores/route.ts',
  'src/app/api/v1/admin/physical-training/types/[typeId]/tasks/route.ts',
  'src/app/api/v1/admin/physical-training/types/route.ts',
  'src/app/api/v1/admin/platoons/[idOrKey]/commander-history/route.ts',
  'src/app/api/v1/admin/positions/[id]/route.ts',
  'src/app/api/v1/admin/positions/active-holder/route.ts',
  'src/app/api/v1/admin/positions/slots/route.ts',
  'src/app/api/v1/admin/punishments/[id]/route.ts',
  'src/app/api/v1/admin/punishments/route.ts',
  'src/app/api/v1/admin/rbac/field-rules/[ruleId]/route.ts',
  'src/app/api/v1/admin/relegation/enrollments/[ocId]/modules/route.ts',
  'src/app/api/v1/admin/relegation/enrollments/[ocId]/route.ts',
  'src/app/api/v1/admin/relegation/exception/route.ts',
  'src/app/api/v1/admin/relegation/history/route.ts',
  'src/app/api/v1/admin/relegation/media/[historyId]/signed-url/route.ts',
  'src/app/api/v1/admin/relegation/promote-course/route.ts',
  'src/app/api/v1/admin/relegation/void-promotion/route.ts',
  'src/app/api/v1/admin/signup-requests/[id]/approve/route.ts',
  'src/app/api/v1/admin/signup-requests/[id]/reject/route.ts',
  'src/app/api/v1/admin/signup-requests/[id]/route.ts',
  'src/app/api/v1/admin/signup-requests/route.ts',
  'src/app/api/v1/admin/site-settings/hero-bg/presign/route.ts',
  'src/app/api/v1/admin/site-settings/hero-bg/route.ts',
  'src/app/api/v1/admin/training-camps/[campId]/activities/[activityId]/route.ts',
  'src/app/api/v1/admin/training-camps/[campId]/activities/route.ts',
  'src/app/api/v1/admin/training-camps/[campId]/route.ts',
  'src/app/api/v1/admin/training-camps/route.ts',
  'src/app/api/v1/admin/users/[id]/route.ts',
  'src/app/api/v1/admin/users/check-username/route.ts',
  'src/app/api/v1/admin/users/route.ts',
] as const;

export const OC_UNCOVERED_ROUTE_FILES = [
  'src/app/api/v1/oc/[ocId]/achievements/[id]/route.ts',
  'src/app/api/v1/oc/[ocId]/achievements/route.ts',
  'src/app/api/v1/oc/[ocId]/autobiography/route.ts',
  'src/app/api/v1/oc/[ocId]/camps/route.ts',
  'src/app/api/v1/oc/[ocId]/club-achievements/[id]/route.ts',
  'src/app/api/v1/oc/[ocId]/club-achievements/route.ts',
  'src/app/api/v1/oc/[ocId]/clubs/[id]/route.ts',
  'src/app/api/v1/oc/[ocId]/clubs/route.ts',
  'src/app/api/v1/oc/[ocId]/counselling/[id]/route.ts',
  'src/app/api/v1/oc/[ocId]/counselling/route.ts',
  'src/app/api/v1/oc/[ocId]/credit-for-excellence/[id]/route.ts',
  'src/app/api/v1/oc/[ocId]/credit-for-excellence/route.ts',
  'src/app/api/v1/oc/[ocId]/discipline/[id]/route.ts',
  'src/app/api/v1/oc/[ocId]/discipline/route.ts',
  'src/app/api/v1/oc/[ocId]/dossier-filling/route.ts',
  'src/app/api/v1/oc/[ocId]/dossier-inspection/route.ts',
  'src/app/api/v1/oc/[ocId]/dossier-snapshot/route.ts',
  'src/app/api/v1/oc/[ocId]/drill/[id]/route.ts',
  'src/app/api/v1/oc/[ocId]/drill/route.ts',
  'src/app/api/v1/oc/[ocId]/education/[id]/route.ts',
  'src/app/api/v1/oc/[ocId]/education/route.ts',
  'src/app/api/v1/oc/[ocId]/family/[id]/route.ts',
  'src/app/api/v1/oc/[ocId]/family/route.ts',
  'src/app/api/v1/oc/[ocId]/images/complete/route.ts',
  'src/app/api/v1/oc/[ocId]/images/presign/route.ts',
  'src/app/api/v1/oc/[ocId]/images/route.ts',
  'src/app/api/v1/oc/[ocId]/interviews/[interviewId]/route.ts',
  'src/app/api/v1/oc/[ocId]/interviews/route.ts',
  'src/app/api/v1/oc/[ocId]/medical-category/[id]/route.ts',
  'src/app/api/v1/oc/[ocId]/medical-category/route.ts',
  'src/app/api/v1/oc/[ocId]/medical/[id]/route.ts',
  'src/app/api/v1/oc/[ocId]/medical/route.ts',
  'src/app/api/v1/oc/[ocId]/motivation-awards/route.ts',
  'src/app/api/v1/oc/[ocId]/obstacle-training/route.ts',
  'src/app/api/v1/oc/[ocId]/olq/[id]/route.ts',
  'src/app/api/v1/oc/[ocId]/olq/by-semester/route.ts',
  'src/app/api/v1/oc/[ocId]/parent-comms/[id]/route.ts',
  'src/app/api/v1/oc/[ocId]/parent-comms/route.ts',
  'src/app/api/v1/oc/[ocId]/performance-graph/route.ts',
  'src/app/api/v1/oc/[ocId]/personal/route.ts',
  'src/app/api/v1/oc/[ocId]/recording-leave-hike-detention/[id]/route.ts',
  'src/app/api/v1/oc/[ocId]/recording-leave-hike-detention/route.ts',
  'src/app/api/v1/oc/[ocId]/special-achievement-in-firing/route.ts',
  'src/app/api/v1/oc/[ocId]/speed-march/route.ts',
  'src/app/api/v1/oc/[ocId]/sports-and-games/route.ts',
  'src/app/api/v1/oc/[ocId]/ssb/points/[id]/route.ts',
  'src/app/api/v1/oc/[ocId]/ssb/points/route.ts',
  'src/app/api/v1/oc/[ocId]/ssb/route.ts',
  'src/app/api/v1/oc/[ocId]/weapon-training/route.ts',
  'src/app/api/v1/oc/bulk-upload/route.ts',
] as const;

export const REPORT_UNCOVERED_ROUTE_FILES = [
  'src/app/api/v1/admin/reports/verification/verify/route.ts',
  'src/app/api/v1/reports/academics/consolidated-sessional/download/route.ts',
  'src/app/api/v1/reports/academics/consolidated-sessional/preview/route.ts',
  'src/app/api/v1/reports/academics/semester-grade/candidates/route.ts',
  'src/app/api/v1/reports/academics/semester-grade/download/route.ts',
  'src/app/api/v1/reports/academics/semester-grade/preview/[ocId]/route.ts',
  'src/app/api/v1/reports/metadata/course-semesters/route.ts',
  'src/app/api/v1/reports/overall-training/course-wise-final-performance/download/route.ts',
  'src/app/api/v1/reports/overall-training/course-wise-final-performance/preview/route.ts',
  'src/app/api/v1/reports/overall-training/course-wise-performance/download/route.ts',
  'src/app/api/v1/reports/overall-training/course-wise-performance/preview/route.ts',
] as const;

export const MISC_UNCOVERED_ROUTE_FILES = [
  'src/app/api/v1/dashboard/data/appointments/route.ts',
  'src/app/api/v1/dashboard/data/course/route.ts',
  'src/app/api/v1/dashboard/data/platoon/route.ts',
] as const;

const EXPLICIT_GROUPS: ApiCoverageGroup[] = [
  {
    testFile: 'tests/api/admin.template-copy.test.ts',
    routeFiles: [
      'src/app/api/v1/admin/interview/templates/copy/route.ts',
      'src/app/api/v1/admin/physical-training/templates/copy/route.ts',
      'src/app/api/v1/admin/training-camps/copy/route.ts',
    ],
  },
  {
    testFile: 'tests/api/admin.interview.templates.test.ts',
    routeFiles: ['src/app/api/v1/admin/interview/templates/route.ts'],
  },
  {
    testFile: 'tests/api/admin.appointments-and-positions.test.ts',
    routeFiles: [
      'src/app/api/v1/admin/appointments/route.ts',
      'src/app/api/v1/admin/positions/route.ts',
    ],
  },
  {
    testFile: 'tests/api/admin.marks-review-workflow.test.ts',
    routeFiles: ['src/app/api/v1/admin/marks-review-workflow/route.ts'],
  },
  {
    testFile: 'tests/api/admin.training-camps.settings.test.ts',
    routeFiles: ['src/app/api/v1/admin/training-camps/settings/route.ts'],
  },
  {
    testFile: 'tests/api/admin.module-access.test.ts',
    routeFiles: ['src/app/api/v1/admin/module-access/route.ts'],
  },
  {
    testFile: 'tests/api/admin.hierarchy.nodes.test.ts',
    routeFiles: [
      'src/app/api/v1/admin/hierarchy/nodes/route.ts',
      'src/app/api/v1/admin/hierarchy/nodes/[id]/route.ts',
      'src/app/api/v1/admin/hierarchy/nodes/reorder/route.ts',
    ],
  },
  {
    testFile: 'tests/api/admin.hierarchy.functional-role-mappings.test.ts',
    routeFiles: ['src/app/api/v1/admin/hierarchy/functional-role-mappings/route.ts'],
  },
  {
    testFile: 'tests/api/admin.delegations.test.ts',
    routeFiles: [
      'src/app/api/v1/admin/delegations/route.ts',
      'src/app/api/v1/admin/delegations/[id]/terminate/route.ts',
    ],
  },
  {
    testFile: 'tests/api/bootstrap.super-admin.test.ts',
    routeFiles: ['src/app/api/v1/bootstrap/super-admin/route.ts'],
  },
  {
    testFile: 'tests/api/me.workflow-notifications.test.ts',
    routeFiles: ['src/app/api/v1/me/workflow-notifications/route.ts'],
  },
  {
    testFile: 'tests/api/me.switchable-identities.test.ts',
    routeFiles: ['src/app/api/v1/me/switchable-identities/route.ts'],
  },
  {
    testFile: 'tests/api/reports.module-access.test.ts',
    routeFiles: ['src/app/api/v1/reports/metadata/course-semesters/route.ts'],
  },
  {
    testFile: 'tests/api/setup.status.test.ts',
    routeFiles: ['src/app/api/v1/setup/status/route.ts'],
  },
  {
    testFile: 'tests/api/oc.academics.workflow.test.ts',
    routeFiles: ['src/app/api/v1/oc/academics/workflow/route.ts'],
  },
  {
    testFile: 'tests/api/oc.physical-training.workflow.test.ts',
    routeFiles: ['src/app/api/v1/oc/physical-training/workflow/route.ts'],
  },
  {
    testFile: 'tests/api/oc.autobiography.test.ts',
    routeFiles: ['src/app/api/v1/oc/[ocId]/autobiography/route.ts'],
  },
  {
    testFile: 'tests/api/oc.dossier-filling.test.ts',
    routeFiles: ['src/app/api/v1/oc/[ocId]/dossier-filling/route.ts'],
  },
  {
    testFile: 'tests/api/oc.dossier-inspection.test.ts',
    routeFiles: ['src/app/api/v1/oc/[ocId]/dossier-inspection/route.ts'],
  },
  {
    testFile: 'tests/api/oc.dossier-snapshot.test.ts',
    routeFiles: ['src/app/api/v1/oc/[ocId]/dossier-snapshot/route.ts'],
  },
  {
    testFile: 'tests/api/oc.physical-training.motivation-awards.test.ts',
    routeFiles: ['src/app/api/v1/oc/[ocId]/physical-training/motivation-awards/route.ts'],
  },
  {
    testFile: 'tests/api/oc.medical.test.ts',
    routeFiles: [
      'src/app/api/v1/oc/[ocId]/medical/route.ts',
      'src/app/api/v1/oc/[ocId]/medical/[id]/route.ts',
    ],
  },
  {
    testFile: 'tests/api/oc.medical-category.test.ts',
    routeFiles: [
      'src/app/api/v1/oc/[ocId]/medical-category/route.ts',
      'src/app/api/v1/oc/[ocId]/medical-category/[id]/route.ts',
    ],
  },
  {
    testFile: 'tests/api/oc.discipline.test.ts',
    routeFiles: ['src/app/api/v1/oc/[ocId]/discipline/[id]/route.ts'],
  },
  {
    testFile: 'tests/api/oc.parent-comms.test.ts',
    routeFiles: ['src/app/api/v1/oc/[ocId]/parent-comms/[id]/route.ts'],
  },
  {
    testFile: 'tests/api/oc.ssb.test.ts',
    routeFiles: ['src/app/api/v1/oc/[ocId]/ssb/route.ts'],
  },
  {
    testFile: 'tests/api/oc.interviews.[interviewId].test.ts',
    routeFiles: ['src/app/api/v1/oc/[ocId]/interviews/[interviewId]/route.ts'],
  },
  {
    testFile: 'tests/api/oc.interviews.test.ts',
    routeFiles: ['src/app/api/v1/oc/[ocId]/interviews/route.ts'],
  },
  {
    testFile: 'tests/api/oc.semester-lock-derived.test.ts',
    routeFiles: [
      'src/app/api/v1/oc/[ocId]/camps/route.ts',
      'src/app/api/v1/oc/[ocId]/interviews/[interviewId]/route.ts',
      'src/app/api/v1/oc/[ocId]/recording-leave-hike-detention/[id]/route.ts',
    ],
  },
  {
    testFile: 'tests/api/admin.route-flow.uncovered.test.ts',
    routeFiles: [...ADMIN_UNCOVERED_ROUTE_FILES],
  },
  {
    testFile: 'tests/api/oc.route-flow.uncovered.test.ts',
    routeFiles: [...OC_UNCOVERED_ROUTE_FILES],
  },
  {
    testFile: 'tests/api/reports.route-flow.uncovered.test.ts',
    routeFiles: [...REPORT_UNCOVERED_ROUTE_FILES],
  },
  {
    testFile: 'tests/api/misc.route-flow.uncovered.test.ts',
    routeFiles: [...MISC_UNCOVERED_ROUTE_FILES],
  },
];

export function getApiCoverageGroups(): ApiCoverageGroup[] {
  const explicitTestFiles = EXPLICIT_GROUPS.map((group) => group.testFile);
  const directGroups = discoverDirectApiCoverageFromTests(path.join(process.cwd(), 'tests/api'), explicitTestFiles);
  return [...directGroups, ...EXPLICIT_GROUPS].sort((left, right) => left.testFile.localeCompare(right.testFile));
}

export function getApiCoverageMethodMap(): Map<string, string[]> {
  const methodMap = new Map<string, string[]>();

  for (const group of getApiCoverageGroups()) {
    for (const routeMethod of expandRouteFilesToMethods(group.routeFiles)) {
      const methodKey = `${routeMethod.method} ${routeMethod.routePath}`;
      const files = methodMap.get(methodKey) ?? [];
      files.push(toPosix(group.testFile));
      methodMap.set(methodKey, files.sort((left, right) => left.localeCompare(right)));
    }
  }

  return methodMap;
}
