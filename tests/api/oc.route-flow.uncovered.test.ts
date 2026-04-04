import '../utils/uncovered-route-mocks';
import { OC_UNCOVERED_ROUTE_FILES } from './coverage.manifest';
import { runUncoveredRouteFlowSuite } from '../utils/uncovered-route-suite';

runUncoveredRouteFlowSuite('OC uncovered API route flows', OC_UNCOVERED_ROUTE_FILES, {
  'src/app/api/v1/oc/[ocId]/images/complete/route.ts': {
    body: {
      POST: {
        kind: 'PROFILE',
        objectKey: 'oc/11111111-1111-4111-8111-111111111111/profile/image.webp',
      },
    },
  },
});
