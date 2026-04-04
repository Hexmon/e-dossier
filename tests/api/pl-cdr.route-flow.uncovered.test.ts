import { vi } from 'vitest';

import '../utils/uncovered-route-mocks';
import { PL_CDR_UNCOVERED_ROUTE_FILES } from './coverage.manifest';
import { runUncoveredRouteFlowSuite } from '../utils/uncovered-route-suite';

import * as platoonCommanderAuth from '@/app/lib/platoon-commander-auth';
import * as cadetAppointmentsQueries from '@/app/db/queries/cadet-appointments';

runUncoveredRouteFlowSuite('Platoon commander uncovered API route flows', PL_CDR_UNCOVERED_ROUTE_FILES, {
  'src/app/api/v1/pl-cdr/cadet-appointments/route.ts': {
    successSetup: {
      GET: async () => {
        vi.mocked(platoonCommanderAuth.requirePlatoonCommanderScope).mockResolvedValue({
          userId: 'pl-cdr-1',
          platoonId: 'platoon-1',
          position: 'PLATOON_COMMANDER',
          roles: ['PLATOON_COMMANDER'],
        });
        vi.mocked(cadetAppointmentsQueries.getCadetAppointmentsDashboard).mockResolvedValue({
          platoon: { id: 'platoon-1', key: 'ARJUN', name: 'Arjun' },
          cadets: [],
          activeAppointments: [],
          historyAppointments: [],
        });
      },
      POST: async () => {
        vi.mocked(platoonCommanderAuth.requirePlatoonCommanderScope).mockResolvedValue({
          userId: 'pl-cdr-1',
          platoonId: 'platoon-1',
          position: 'PLATOON_COMMANDER',
          roles: ['PLATOON_COMMANDER'],
        });
        vi.mocked(cadetAppointmentsQueries.createCadetAppointment).mockResolvedValue({
          id: 'cadet-apt-1',
          cadetId: '22222222-2222-4222-8222-222222222222',
          cadetName: 'Cadet One',
          cadetOcNo: 'OC-01',
          platoonId: 'platoon-1',
          platoonName: 'Arjun',
          appointmentName: 'Cadet Captain',
          startsAt: new Date('2025-01-01T00:00:00.000Z'),
          endsAt: null,
          reason: 'Unit appointment',
          appointedByName: 'PL CDR',
          endedByName: null,
          deletedAt: null,
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
          updatedAt: new Date('2025-01-01T00:00:00.000Z'),
        });
      },
    },
    skipAuthFailure: true,
  },
  'src/app/api/v1/pl-cdr/cadet-appointments/[id]/route.ts': {
    successSetup: {
      GET: async () => {
        vi.mocked(platoonCommanderAuth.requirePlatoonCommanderScope).mockResolvedValue({
          userId: 'pl-cdr-1',
          platoonId: 'platoon-1',
          position: 'PLATOON_COMMANDER',
          roles: ['PLATOON_COMMANDER'],
        });
        vi.mocked(cadetAppointmentsQueries.getCadetAppointmentById).mockResolvedValue({
          id: '22222222-2222-4222-8222-222222222222',
          cadetId: 'cadet-1',
          cadetName: 'Cadet One',
          cadetOcNo: 'OC-01',
          platoonId: 'platoon-1',
          platoonName: 'Arjun',
          appointmentName: 'Cadet Captain',
          startsAt: new Date('2025-01-01T00:00:00.000Z'),
          endsAt: null,
          reason: null,
          appointedByName: 'PL CDR',
          endedByName: null,
          deletedAt: null,
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
          updatedAt: new Date('2025-01-01T00:00:00.000Z'),
        });
      },
      PATCH: async () => {
        vi.mocked(platoonCommanderAuth.requirePlatoonCommanderScope).mockResolvedValue({
          userId: 'pl-cdr-1',
          platoonId: 'platoon-1',
          position: 'PLATOON_COMMANDER',
          roles: ['PLATOON_COMMANDER'],
        });
        vi.mocked(cadetAppointmentsQueries.updateCadetAppointment).mockResolvedValue({
          before: {
            id: '22222222-2222-4222-8222-222222222222',
            cadetId: 'cadet-1',
            platoonId: 'platoon-1',
            appointmentName: 'Cadet Captain',
            startsAt: new Date('2025-01-01T00:00:00.000Z'),
            endsAt: null,
            appointedBy: 'pl-cdr-1',
            endedBy: null,
            reason: null,
            deletedAt: null,
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            updatedAt: new Date('2025-01-01T00:00:00.000Z'),
          },
          after: {
            id: '22222222-2222-4222-8222-222222222222',
            cadetId: 'cadet-2',
            cadetName: 'Cadet Two',
            cadetOcNo: 'OC-02',
            platoonId: 'platoon-1',
            platoonName: 'Arjun',
            appointmentName: 'Cadet Captain',
            startsAt: new Date('2025-02-01T00:00:00.000Z'),
            endsAt: null,
            reason: null,
            appointedByName: 'PL CDR',
            endedByName: null,
            deletedAt: null,
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            updatedAt: new Date('2025-02-01T00:00:00.000Z'),
          },
        });
      },
      DELETE: async () => {
        vi.mocked(platoonCommanderAuth.requirePlatoonCommanderScope).mockResolvedValue({
          userId: 'pl-cdr-1',
          platoonId: 'platoon-1',
          position: 'PLATOON_COMMANDER',
          roles: ['PLATOON_COMMANDER'],
        });
        vi.mocked(cadetAppointmentsQueries.deleteCadetAppointment).mockResolvedValue({
          id: '22222222-2222-4222-8222-222222222222',
          cadetId: 'cadet-1',
          platoonId: 'platoon-1',
          appointmentName: 'Cadet Captain',
          startsAt: new Date('2025-01-01T00:00:00.000Z'),
          endsAt: null,
          appointedBy: 'pl-cdr-1',
          endedBy: null,
          reason: null,
          deletedAt: null,
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
          updatedAt: new Date('2025-01-01T00:00:00.000Z'),
        });
      },
    },
    skipAuthFailure: true,
  },
  'src/app/api/v1/pl-cdr/cadet-appointments/[id]/transfer/route.ts': {
    successSetup: {
      POST: async () => {
        vi.mocked(platoonCommanderAuth.requirePlatoonCommanderScope).mockResolvedValue({
          userId: 'pl-cdr-1',
          platoonId: 'platoon-1',
          position: 'PLATOON_COMMANDER',
          roles: ['PLATOON_COMMANDER'],
        });
        vi.mocked(cadetAppointmentsQueries.transferCadetAppointment).mockResolvedValue({
          ended: {
            id: '22222222-2222-4222-8222-222222222222',
            cadetId: 'cadet-1',
            platoonId: 'platoon-1',
            appointmentName: 'Cadet Captain',
            startsAt: new Date('2025-01-01T00:00:00.000Z'),
            endsAt: new Date('2025-02-01T00:00:00.000Z'),
            appointedBy: 'pl-cdr-1',
            endedBy: 'pl-cdr-1',
            reason: null,
            deletedAt: null,
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            updatedAt: new Date('2025-02-01T00:00:00.000Z'),
          },
          next: {
            id: 'cadet-apt-2',
            cadetId: 'cadet-2',
            cadetName: 'Cadet Two',
            cadetOcNo: 'OC-02',
            platoonId: 'platoon-1',
            platoonName: 'Arjun',
            appointmentName: 'Cadet Captain',
            startsAt: new Date('2025-02-02T00:00:00.000Z'),
            endsAt: null,
            reason: null,
            appointedByName: 'PL CDR',
            endedByName: null,
            deletedAt: null,
            createdAt: new Date('2025-02-02T00:00:00.000Z'),
            updatedAt: new Date('2025-02-02T00:00:00.000Z'),
          },
        });
      },
    },
    skipAuthFailure: true,
  },
});
