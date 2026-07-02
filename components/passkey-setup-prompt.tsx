"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { KeyRound } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  function authErrorMessage(errorCode: unknown, fallbackKey: string) {
    if (typeof errorCode !== "string") return t(fallbackKey as any);
    try {
      return t(`auth_errors.${errorCode}` as any);
    } catch {
      return t(fallbackKey as any);
    }
  }

  function dismissPrompt() {
    if (session?.email) {
      localStorage.setItem(`passkeyPromptDismissed:${session.email}`, "true");
    }
    setOpen(false);
  }

  async function handleRegisterPasskey() {
    setLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/passkey/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const options = await optionsRes.json();
      if (!optionsRes.ok) {
        toast.error(authErrorMessage(options.errorCode, "passkey_setup_failed"));
        return;
      }

      const attestation = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attestation),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        toast.error(authErrorMessage(verifyData.errorCode, "passkey_setup_failed"));
        return;
      }

      toast.success(t("passkey_setup_success"));
      setOpen(false);
      await mutate();
    } catch (error) {
      console.error(error);
      toast.error(t("passkey_setup_failed"));
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
