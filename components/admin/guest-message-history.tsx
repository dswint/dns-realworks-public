"use client";

import { useRef, useState, useTransition } from "react";

import { listGuestMessagesAction } from "@/app/admin/(app)/guests/actions";
import { Button } from "@/components/ui/button";
import type { GuestMessageThread } from "@/lib/guest-messages";

function formatStay(checkIn: string | null, checkOut: string | null) {
  if (!checkIn && !checkOut) return null;
  if (checkIn && checkOut) return `${checkIn} – ${checkOut}`;
  return checkIn ?? checkOut;
}

function formatSent(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function GuestMessageHistory({
  guestId,
  guestName,
  count,
}: {
  guestId: string;
  guestName: string;
  count: number;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [threads, setThreads] = useState<GuestMessageThread[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    dialogRef.current?.showModal();
    if (threads || pending) return;
    startTransition(async () => {
      const result = await listGuestMessagesAction(guestId);
      if (result.error) {
        setError(result.error);
        setThreads([]);
        return;
      }
      setError(null);
      setThreads(result.threads);
    });
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={open}>
        {count > 0 ? `Messages (${count})` : "Messages"}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`messages-${guestId}`}
        className="bg-background text-foreground backdrop:bg-foreground/40 w-[min(40rem,calc(100%-2rem))] max-w-none rounded-xl p-0 shadow-lg"
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="flex max-h-[min(40rem,calc(100dvh-2rem))] flex-col">
          <div className="border-border flex items-start justify-between gap-3 border-b px-4 py-3">
            <div>
              <h2 id={`messages-${guestId}`} className="text-lg">
                {guestName}
              </h2>
              <p className="text-muted-foreground text-xs">Message history</p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={close}>
              Close
            </Button>
          </div>
          <div className="space-y-6 overflow-y-auto px-4 py-4">
            {pending && !threads ? (
              <p className="text-muted-foreground text-sm">Loading messages…</p>
            ) : null}
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            {threads && threads.length === 0 && !error ? (
              <p className="text-muted-foreground text-sm">
                No saved messages for this guest yet.
              </p>
            ) : null}
            {threads?.map((thread) => {
              const stay = formatStay(thread.checkIn, thread.checkOut);
              return (
                <section key={thread.id} className="space-y-3">
                  <header className="text-muted-foreground text-xs">
                    <p className="text-foreground text-sm">
                      {thread.propertyName ?? "Stay"}
                    </p>
                    {stay ? <p>{stay}</p> : null}
                  </header>
                  <ol className="space-y-2">
                    {thread.messages.map((message) => {
                      const fromGuest = message.direction === "guest";
                      return (
                        <li
                          key={message.id}
                          className={
                            fromGuest
                              ? "flex justify-start"
                              : "flex justify-end"
                          }
                        >
                          <div
                            className={
                              fromGuest
                                ? "bg-secondary max-w-[85%] rounded-2xl rounded-bl-md px-3 py-2"
                                : "bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-md px-3 py-2"
                            }
                          >
                            <p className="text-xs opacity-70">
                              {fromGuest ? "Guest" : "Host"}
                              {message.sentAt
                                ? ` · ${formatSent(message.sentAt)}`
                                : ""}
                            </p>
                            <p className="mt-1 text-sm whitespace-pre-wrap">
                              {message.body}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })}
          </div>
        </div>
      </dialog>
    </>
  );
}
