import { useQuery } from '@tanstack/react-query';
import { useDeviceRefreshInterval } from '@/hooks/useDeviceRefreshInterval';

export type NavItem = {
    key: string;
    label: string;
    url: string;
    icon: string;
    badge?: string;
    specialAction?: string;
    children?: NavItem[];
};

export type NavSection = {
    key: string;
    label: string;
    collapsible?: boolean;
    items: NavItem[];
};

export type NavigationResponse = {
    sections: NavSection[];
    generatedAt: string;
    userRoleSummary: string[];
};

async function fetchNavigation(): Promise<NavigationResponse> {
    const res = await fetch('/api/v1/me/navigation');
    if (!res.ok) {
        throw new Error('Failed to fetch navigation');
    }
    return res.json();
}

export function useNavigation() {
    const { refreshIntervalMs } = useDeviceRefreshInterval();

    return useQuery({
        queryKey: ['navigation', 'me'],
        queryFn: fetchNavigation,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchInterval: refreshIntervalMs || false,
        refetchIntervalInBackground: false,
    });
}
