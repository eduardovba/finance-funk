import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ═══════════ DEMO MODE TOGGLE ═══════════

let _queriesEnabled = true;

export function setQueriesEnabled(enabled: boolean) {
    _queriesEnabled = enabled;
}

// ═══════════ QUERY KEYS ═══════════

export const queryKeys = {
    transactions: ['transactions'] as const,
    equityTransactions: ['equity-transactions'] as const,
    cryptoTransactions: ['crypto-transactions'] as const,
    fixedIncome: ['fixed-income'] as const,
    pensions: ['pensions'] as const,
    debtTransactions: ['debt-transactions'] as const,
    realEstate: ['real-estate'] as const,
    historicalSnapshots: ['history'] as const,
    ledgerData: ['ledger-data'] as const,
    fxRates: ['fx-rates'] as const,
    allocationTargets: ['allocation-targets'] as const,
    assetClasses: ['asset-classes'] as const,
    appSettings: ['app-settings'] as const,
    forecastSettings: ['forecast-settings'] as const,
    dashboardConfig: ['dashboard-config'] as const,
    pensionPrices: ['pension-prices'] as const,
};

// ═══════════ GENERIC FETCHER ═══════════

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `API error: ${res.status}`);
    }
    return res.json();
}

// ═══════════ PORTFOLIO DATA QUERIES ═══════════

export function useTransactionsQuery() {
    return useQuery({
        queryKey: queryKeys.transactions,
        queryFn: () => apiFetch<any[]>('/api/transactions'),
        enabled: _queriesEnabled,
    });
}

export function useEquityTransactionsQuery() {
    return useQuery({
        queryKey: queryKeys.equityTransactions,
        queryFn: () => apiFetch<any[]>('/api/equity-transactions'),
        enabled: _queriesEnabled,
    });
}

export function useCryptoTransactionsQuery() {
    return useQuery({
        queryKey: queryKeys.cryptoTransactions,
        queryFn: () => apiFetch<any[]>('/api/crypto-transactions'),
        enabled: _queriesEnabled,
    });
}

export function useFixedIncomeQuery() {
    return useQuery({
        queryKey: queryKeys.fixedIncome,
        queryFn: () => apiFetch<any[]>('/api/fixed-income'),
        enabled: _queriesEnabled,
    });
}

export function usePensionsQuery() {
    return useQuery({
        queryKey: queryKeys.pensions,
        queryFn: () => apiFetch<any[]>('/api/pensions'),
        enabled: _queriesEnabled,
    });
}

export function useDebtTransactionsQuery() {
    return useQuery({
        queryKey: queryKeys.debtTransactions,
        queryFn: () => apiFetch<any[]>('/api/debt-transactions'),
        enabled: _queriesEnabled,
    });
}

export function useRealEstateQuery() {
    return useQuery({
        queryKey: queryKeys.realEstate,
        queryFn: () => apiFetch<any>('/api/real-estate'),
        enabled: _queriesEnabled,
    });
}

export function useHistoricalSnapshotsQuery() {
    return useQuery({
        queryKey: queryKeys.historicalSnapshots,
        queryFn: () => apiFetch<any[]>('/api/history'),
        enabled: _queriesEnabled,
    });
}

export function useLedgerDataQuery() {
    return useQuery({
        queryKey: queryKeys.ledgerData,
        queryFn: () => apiFetch<any>('/api/ledger-data').then(d => d.content),
        enabled: _queriesEnabled,
    });
}

export function useFxRatesQuery() {
    return useQuery({
        queryKey: queryKeys.fxRates,
        queryFn: () => apiFetch<any>('/api/fx-rates'),
        enabled: _queriesEnabled,
    });
}

export function usePensionPricesQuery() {
    return useQuery({
        queryKey: queryKeys.pensionPrices,
        queryFn: () => apiFetch<any>('/api/pension-prices'),
        enabled: _queriesEnabled,
    });
}

// ═══════════ SETTINGS QUERIES ═══════════

export function useAllocationTargetsQuery() {
    return useQuery({
        queryKey: queryKeys.allocationTargets,
        queryFn: () => apiFetch<any>('/api/allocation-targets'),
        enabled: _queriesEnabled,
    });
}

export function useAssetClassesQuery() {
    return useQuery({
        queryKey: queryKeys.assetClasses,
        queryFn: () => apiFetch<any>('/api/asset-classes'),
        enabled: _queriesEnabled,
    });
}

export function useAppSettingsQuery() {
    return useQuery({
        queryKey: queryKeys.appSettings,
        queryFn: () => apiFetch<any>('/api/app-settings'),
        enabled: _queriesEnabled,
    });
}

export function useForecastSettingsQuery() {
    return useQuery({
        queryKey: queryKeys.forecastSettings,
        queryFn: () => apiFetch<any>('/api/forecast-settings'),
        enabled: _queriesEnabled,
    });
}

export function useDashboardConfigQuery() {
    return useQuery({
        queryKey: queryKeys.dashboardConfig,
        queryFn: () => apiFetch<any>('/api/dashboard-config'),
        enabled: _queriesEnabled,
    });
}

// ═══════════ MUTATIONS ═══════════

export function useSaveTransactionMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => apiFetch('/api/transactions', {
            method: data.id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
            queryClient.invalidateQueries({ queryKey: queryKeys.equityTransactions });
            queryClient.invalidateQueries({ queryKey: queryKeys.cryptoTransactions });
            queryClient.invalidateQueries({ queryKey: queryKeys.fixedIncome });
            queryClient.invalidateQueries({ queryKey: queryKeys.realEstate });
            queryClient.invalidateQueries({ queryKey: queryKeys.pensions });
            queryClient.invalidateQueries({ queryKey: queryKeys.debtTransactions });
            queryClient.invalidateQueries({ queryKey: queryKeys.historicalSnapshots });
        },
    });
}

export function useDeleteTransactionMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string | number) => apiFetch(`/api/transactions?id=${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
            queryClient.invalidateQueries({ queryKey: queryKeys.equityTransactions });
            queryClient.invalidateQueries({ queryKey: queryKeys.cryptoTransactions });
            queryClient.invalidateQueries({ queryKey: queryKeys.fixedIncome });
            queryClient.invalidateQueries({ queryKey: queryKeys.realEstate });
            queryClient.invalidateQueries({ queryKey: queryKeys.pensions });
            queryClient.invalidateQueries({ queryKey: queryKeys.debtTransactions });
        },
    });
}

export function useSaveSnapshotMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (snapshot: any) => apiFetch('/api/snapshots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(snapshot),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.historicalSnapshots });
        },
    });
}
