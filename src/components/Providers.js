"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function Providers({ children }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,        // Fresh for 1 minute
                gcTime: 5 * 60 * 1000,       // Cache kept 5 minutes
                retry: 2,                     // Retry failed requests twice
                refetchOnWindowFocus: false,  // Finance data refreshes explicitly
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <SessionProvider>{children}</SessionProvider>
        </QueryClientProvider>
    );
}
