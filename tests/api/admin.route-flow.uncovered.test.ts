import '../utils/uncovered-route-mocks';
import { ADMIN_UNCOVERED_ROUTE_FILES } from './coverage.manifest';
import { runUncoveredRouteFlowSuite } from '../utils/uncovered-route-suite';

runUncoveredRouteFlowSuite('Admin uncovered API route flows', ADMIN_UNCOVERED_ROUTE_FILES, {
  'src/app/api/v1/admin/positions/active-holder/route.ts': {
    query: {
      GET: '?positionKey=ADMIN',
    },
  },
  'src/app/api/v1/admin/positions/[id]/route.ts': {
    skipAuthFailure: {
      GET: true,
    },
  },
  'src/app/api/v1/admin/positions/slots/route.ts': {
    skipAuthFailure: true,
  },
  'src/app/api/v1/admin/users/check-username/route.ts': {
    query: {
      GET: '?username=testuser',
    },
    skipAuthFailure: true,
  },
});
