"use client";

import Image from "next/image";
import Link from "next/link";
import { Ticket, QrCode, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NFTAttribute {
  trait_type: string;
  value: string;
}

interface TicketCardProps {
  nftId: string;
  name: string;
  image?: string;
  description?: string;
  attributes?: NFTAttribute[];
}

export function TicketCard({
  nftId,
  name,
  image,
  description,
  attributes = [],
}: TicketCardProps) {
  const statusAttr = attributes.find((a) => a.trait_type === "Status");
  const status = statusAttr?.value ?? "Unused";
  const isUsed = status === "Used";
  const usedAt = attributes.find((a) => a.trait_type === "Used_At")?.value;

  return (
    <Link href={`/mypage/${nftId}`} className="block group">
      <Card
        className={`overflow-hidden transition-all duration-200 ${isUsed
            ? "opacity-90 grayscale-[0.3] border-border/40 hover:opacity-100 hover:border-border/60 hover:shadow-sm"
            : "shadow-md hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 border-border/60"
          }`}
      >
        <CardContent className="p-0">
          <div className="flex gap-4 p-4">
            {/* Thumbnail */}
            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border/10">
              {image ? (
                <Image
                  src={image}
                  alt={name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="80px"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Ticket className="w-8 h-8 text-muted-foreground/50" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 min-w-0 gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {name}
                </h3>
                <Badge
                  variant={isUsed ? "secondary" : "default"}
                  className={`flex-shrink-0 text-[10px] px-2 h-5 ${isUsed
                      ? "bg-muted text-muted-foreground border-border"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    }`}
                >
                  {isUsed ? "Used" : "Ready"}
                </Badge>
              </div>

              {description && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {description}
                </p>
              )}

              <div className="mt-auto flex items-center justify-between pt-1">
                {isUsed && usedAt ? (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500/70" />
                    <span>{new Date(usedAt).toLocaleDateString("ja-JP")}</span>
                  </p>
                ) : (
                  <div className="flex items-center gap-1 text-[10px] font-medium text-primary">
                    <QrCode className="w-3 h-3" />
                    <span>Show QR</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
