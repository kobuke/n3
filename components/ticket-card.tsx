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
    <Card
      className={`overflow-hidden transition-all ${
        isUsed
          ? "opacity-60 border-border/30"
          : "shadow-md hover:shadow-lg border-border/50"
      }`}
    >
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          {/* Thumbnail */}
          <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {image ? (
              <Image
                src={image}
                alt={name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Ticket className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col flex-1 min-w-0 gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm text-foreground truncate">
                {name}
              </h3>
              <Badge
                variant={isUsed ? "secondary" : "default"}
                className={`flex-shrink-0 text-xs ${
                  isUsed ? "" : "bg-accent text-accent-foreground"
                }`}
              >
                {isUsed ? "Used" : "Unused"}
              </Badge>
            </div>

            {description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {description}
              </p>
            )}

            {isUsed && usedAt && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-auto">
                <CheckCircle2 className="w-3 h-3" />
                Used: {new Date(usedAt).toLocaleString("ja-JP")}
              </p>
            )}

            {!isUsed && (
              <Link href={`/mypage/${nftId}`} className="mt-auto">
                <Button
                  size="sm"
                  className="gap-1.5 h-8 text-xs w-full sm:w-auto"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Show QR Code
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
