import '../utils/uncovered-route-mocks';
import { MISC_UNCOVERED_ROUTE_FILES } from './coverage.manifest';
import { runUncoveredRouteFlowSuite } from '../utils/uncovered-route-suite';

runUncoveredRouteFlowSuite('Misc uncovered API route flows', MISC_UNCOVERED_ROUTE_FILES, {
});
