"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Ticket, RefreshCw } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { TicketCard } from "@/components/ticket-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  });

export default function MyPage() {
  const router = useRouter();

  const {
    data: session,
    error: sessionError,
    isLoading: sessionLoading,
  } = useSWR("/api/session", fetcher);

  const {
    data: nftData,
    error: nftError,
    isLoading: nftLoading,
    mutate,
  } = useSWR(
    session?.authenticated ? "/api/nfts" : null,
    fetcher
  );

  useEffect(() => {
    if (!sessionLoading && (sessionError || !session?.authenticated)) {
      router.push("/");
    }
  }, [session, sessionError, sessionLoading, router]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!session?.authenticated) return null;

  const nfts: any[] = nftData?.nfts ?? [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader email={session.email} />

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">My Tickets</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {nfts.length > 0
                ? `${nfts.length} ticket${nfts.length > 1 ? "s" : ""} found`
                : "Loading..."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>

        {/* Loading state */}
        {nftLoading && (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Error state */}
        {nftError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive font-medium">
              Failed to load tickets
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Please try refreshing the page.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => mutate()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!nftLoading && !nftError && nfts.length === 0 && (
          <div className="rounded-xl border border-border/50 bg-card p-10 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Ticket className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">No tickets yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              NFT tickets linked to your wallet will appear here once minted.
            </p>
          </div>
        )}

        {/* NFT List */}
        {!nftLoading && !nftError && nfts.length > 0 && (
          <div className="flex flex-col gap-4">
            {nfts.map((nft: any) => {
              const id = nft.id ?? nft.tokenId ?? nft.nftId;
              const meta = nft.metadata ?? {};
              return (
                <TicketCard
                  key={id}
                  nftId={id}
                  name={meta.name ?? nft.name ?? "NFT Ticket"}
                  image={meta.image ?? nft.image}
                  description={meta.description ?? nft.description}
                  attributes={meta.attributes ?? []}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
