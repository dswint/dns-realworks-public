"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { NOTICE_MESSAGES, type FormState, type Notice } from "@/lib/form-state";

export function useFormFeedback(state: FormState, success = "Saved.") {
  useEffect(() => {
    if (!state.at) return;
    if (state.error) toast.error(state.error);
    else if (state.saved) toast.success(state.message ?? success);
  }, [state.at, state.error, state.saved, state.message, success]);
}

function FlashToastInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const notice = searchParams.get("notice");

  useEffect(() => {
    if (!notice || !(notice in NOTICE_MESSAGES)) return;
    toast.success(NOTICE_MESSAGES[notice as Notice]);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("notice");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [notice, pathname, router, searchParams]);

  return null;
}

export function FlashToast() {
  return (
    <Suspense fallback={null}>
      <FlashToastInner />
    </Suspense>
  );
}
