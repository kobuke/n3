"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePasskeyRegistration } from "@/hooks/use-passkey-registration";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  });

export function PasskeySetupPrompt() {
  const t = useTranslations("MyPage");
  const tCommon = useTranslations("Common");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const registerPasskey = usePasskeyRegistration();

  const { data: session, mutate } = useSWR("/api/session", fetcher, {
    revalidateOnFocus: false,
  });

  const isLoginPage = /^\/(ja|en)?\/?$/.test(pathname || "");
  const shouldPrompt = Boolean(
    !isLoginPage &&
    session?.authenticated &&
    session.email &&
    !session.passkeyEnabled
  );

  useEffect(() => {
    if (!shouldPrompt || !session?.email) return;
    const dismissedKey = `passkeyPromptDismissed:${session.email}`;
    if (localStorage.getItem(dismissedKey) === "true") return;
    setOpen(true);
  }, [session?.email, shouldPrompt]);

  function dismissPrompt() {
    if (session?.email) {
      localStorage.setItem(`passkeyPromptDismissed:${session.email}`, "true");
    }
    setOpen(false);
  }

  async function handleRegisterPasskey() {
    setLoading(true);
    try {
      const registered = await registerPasskey({
        onSuccess: async () => {
          setOpen(false);
          await mutate();
        },
      });
      if (!registered) return;
    } finally {
      setLoading(false);
    }
  }

  if (!shouldPrompt) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) {
        setOpen(true);
      } else {
        dismissPrompt();
      }
    }}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-xl sm:max-w-md">
        <DialogHeader className="text-left">
          <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle>{t("passkey_prompt_title")}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {t("passkey_prompt_desc")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:flex-col sm:justify-start">
          <Button
            onClick={handleRegisterPasskey}
            disabled={loading}
            className="h-11 w-full font-bold"
          >
            {loading ? tCommon("processing") : t("passkey_setup_action")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={dismissPrompt}
            disabled={loading}
            className="h-10 w-full"
          >
            {t("passkey_prompt_later")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
