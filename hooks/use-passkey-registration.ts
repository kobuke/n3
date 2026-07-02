"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAuthErrorMessage } from "@/hooks/use-auth-error-message";

type RegisterPasskeyOptions = {
  onSuccess?: () => void | Promise<void>;
};

export function usePasskeyRegistration() {
  const t = useTranslations("MyPage");
  const authErrorMessage = useAuthErrorMessage("MyPage");

  return async function registerPasskey(options: RegisterPasskeyOptions = {}) {
    try {
      const optionsRes = await fetch("/api/auth/passkey/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const registrationOptions = await optionsRes.json();
      if (!optionsRes.ok) {
        toast.error(authErrorMessage(registrationOptions.errorCode, "passkey_setup_failed"));
        return false;
      }

      const attestation = await startRegistration({ optionsJSON: registrationOptions });
      const verifyRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attestation),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        toast.error(authErrorMessage(verifyData.errorCode, "passkey_setup_failed"));
        return false;
      }

      toast.success(t("passkey_setup_success"));
      await options.onSuccess?.();
      return true;
    } catch (error) {
      console.error(error);
      toast.error(t("passkey_setup_failed"));
      return false;
    }
  };
}
