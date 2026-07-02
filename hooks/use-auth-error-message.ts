"use client";

import { useTranslations } from "next-intl";

export function useAuthErrorMessage(namespace: "LoginPage" | "MyPage") {
  const t = useTranslations(namespace);

  return (errorCode: unknown, fallbackKey: string) => {
    if (typeof errorCode !== "string") return t(fallbackKey as any);

    try {
      return t(`auth_errors.${errorCode}` as any);
    } catch {
      return t(fallbackKey as any);
    }
  };
}
