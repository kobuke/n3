"use client";

import { Link, usePathname } from "@/i18n/routing";
import { User, Grid2X2, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

const SHOP_URL = `https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN || 'nanjo-nft-2.myshopify.com'}`;

export function BottomNav() {
    const t = useTranslations('BottomNav');
    const pathname = usePathname();

    const navItems = [
        {
            label: t('mypage'),
            href: "/mypage" as const,
            icon: User,
            match: (p: string) => p === "/mypage",
        },
        {
            label: t('my_nfts'),
            href: "/mypage/nfts" as const,
            icon: Grid2X2,
            match: (p: string) => p === "/mypage/nfts",
        },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-slate-200 bg-white/90 backdrop-blur-lg px-4 pb-safe pt-2 max-w-lg mx-auto">
            {navItems.map(({ label, href, icon: Icon, match }) => {
                const isActive = match(pathname);
                return (
                    <Link
                        key={label}
                        href={href}
                        className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-colors ${isActive ? "text-primary" : "text-slate-400 hover:text-slate-600"
                            }`}
                    >
                        <Icon
                            className="w-5 h-5"
                            strokeWidth={isActive ? 2.5 : 1.8}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
                    </Link>
                );
            })}

            {/* Shop — external link */}
            <a
                href={SHOP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
                <ShoppingBag className="w-5 h-5" strokeWidth={1.8} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{t('shop')}</span>
            </a>
        </div>
    );
}
