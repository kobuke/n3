"use client";

import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, polygon, arbitrum } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'

// 1. Get projectId
// Using a placeholder for now unless the user provides one. 
// Without a valid ID, it will work but with warnings/rate limits.
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'f2b604b901614f04c6436e39527f309a' // Fallback public ID (do not use in prod)

// 2. Set up Wagmi Adapter
export const networks = [mainnet, polygon, arbitrum]

export const wagmiAdapter = new WagmiAdapter({
    projectId,
    networks
})

// 3. Create the AppKit instance
createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    features: {
        email: false, // We use our own Crossmint email login
        socials: [],
        analytics: true
    }
})

// 4. Create QueryClient
const queryClient = new QueryClient()

export function AppKitProvider({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    )
}
