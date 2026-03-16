import '../utils/uncovered-route-mocks';
import { REPORT_UNCOVERED_ROUTE_FILES } from './coverage.manifest';
import { buildInvocationFromRouteFile } from '../utils/api-route-flow';
import { makeJsonRequest } from '../utils/next';
import { runUncoveredRouteFlowSuite } from '../utils/uncovered-route-suite';

runUncoveredRouteFlowSuite('Report uncovered API route flows', REPORT_UNCOVERED_ROUTE_FILES, {
  'src/app/api/v1/admin/reports/verification/verify/route.ts': {
    requestFactory: {
      POST: () => {
        const { path, params } = buildInvocationFromRouteFile(
          'src/app/api/v1/admin/reports/verification/verify/route.ts',
        );
        const req: any = makeJsonRequest({
          method: 'POST',
          path,
          headers: {
            'content-type': 'multipart/form-data; boundary=test',
          },
        });

        req.formData = async () => {
          const formData = new FormData();
          formData.set('versionId', 'RPT-0001');
          return formData;
        };

        return { req, params };
      },
    },
    expectedStatus: {
      POST: 200,
    },
  },
  'src/app/api/v1/reports/academics/semester-grade/candidates/route.ts': {
    query: {
      GET: '?courseId=33333333-3333-4333-8333-333333333333&semester=1&branches=E',
    },
  },
});
