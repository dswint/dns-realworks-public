"use client";

/**
 * Canonical property booking calendar — one month, range selection, Book CTA.
 * See `.cursor/rules/booking-calendar.mdc`. Data from `fetchPropertyStayCalendar`.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  monthKeyFromDate,
  monthLabel,
  shiftMonth,
  weeksForMonth,
  WEEKDAY_LABELS,
  type CalendarDayCell,
} from "@/lib/calendar-grid";
import { eachNight, isValidStayRange, utcToday } from "@/lib/dates";
import { cn } from "@/lib/utils";

function inStayNight(
  date: string,
  checkIn: string | null,
  checkOut: string | null,
) {
  if (!checkIn || !checkOut) return false;
  return date >= checkIn && date < checkOut;
}

function isCheckoutDay(date: string, checkOut: string | null) {
  return Boolean(checkOut && date === checkOut);
}

function reviewDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function rangeNightsAvailable(
  byDate: Map<string, CalendarDayCell>,
  checkIn: string,
  checkOut: string,
) {
  return eachNight(checkIn, checkOut).every(
    (night) => byDate.get(night)?.available === true,
  );
}

export function PropertyBookingCalendar({
  slug,
  days,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 2,
  canBookDirect,
  airbnbUrl,
  review = false,
}: {
  slug: string;
  days: CalendarDayCell[];
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
  canBookDirect: boolean;
  airbnbUrl?: string | null;
  review?: boolean;
}) {
  const byDate = useMemo(
    () => new Map(days.map((day) => [day.date, day])),
    [days],
  );

  const firstMonth = monthKeyFromDate(days[0]?.date ?? utcToday());
  const lastMonth = monthKeyFromDate(days[days.length - 1]?.date ?? utcToday());
  const today = utcToday();

  const [viewMonth, setViewMonth] = useState(() =>
    monthKeyFromDate(initialCheckIn ?? today),
  );
  const [checkIn, setCheckIn] = useState<string | null>(initialCheckIn ?? null);
  const [checkOut, setCheckOut] = useState<string | null>(
    initialCheckOut ?? null,
  );
  const [guests, setGuests] = useState(initialGuests);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const monthDays = days.filter((d) => d.date.startsWith(`${viewMonth}-`));
  const weeks = weeksForMonth(viewMonth, monthDays);

  const canGoPrev = viewMonth > firstMonth;
  const canGoNext = viewMonth < lastMonth;

  const rangeValid =
    checkIn &&
    checkOut &&
    isValidStayRange(checkIn, checkOut) &&
    rangeNightsAvailable(byDate, checkIn, checkOut);

  const continueHref =
    rangeValid && checkIn && checkOut
      ? `/book?property=${encodeURIComponent(slug)}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
      : null;

  const signInHref = continueHref
    ? `/account?next=${encodeURIComponent(continueHref)}`
    : `/account?next=${encodeURIComponent(`/properties/${slug}#availability`)}`;

  function onDayClick(date: string) {
    if (date < today) return;
    setRangeError(null);

    const pickingDeparture = Boolean(checkIn && !checkOut);

    if (!pickingDeparture) {
      if (!byDate.get(date)?.available) return;
      if (!checkIn || (checkIn && checkOut)) {
        setCheckIn(date);
        setCheckOut(null);
        return;
      }
    }

    if (pickingDeparture) {
      if (date <= checkIn!) {
        if (!byDate.get(date)?.available) return;
        setCheckIn(date);
        setCheckOut(null);
        return;
      }
      if (!rangeNightsAvailable(byDate, checkIn!, date)) {
        setRangeError(
          "That range includes booked nights. Pick a shorter stay.",
        );
        return;
      }
      setCheckOut(date);
    }
  }

  function dayDisabled(date: string, available: boolean) {
    if (date < today) return true;
    if (checkIn && !checkOut) return date <= checkIn;
    return !available;
  }

  return (
    <section
      id="availability"
      className="border-border bg-card max-w-md scroll-mt-24 space-y-5 rounded-2xl border p-5 shadow-sm"
      aria-label={review ? "Review your stay" : "Book your stay"}
    >
      <div>
        <h2 className="text-xl font-medium">
          {review ? "Your stay" : "Book your stay"}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {review && checkIn && checkOut
            ? `${reviewDate(checkIn)} – ${reviewDate(checkOut)} · ${eachNight(checkIn, checkOut).length} ${eachNight(checkIn, checkOut).length === 1 ? "night" : "nights"} · ${guests} ${guests === 1 ? "guest" : "guests"}`
            : "Select an arrival night, then your departure date. Direct booking is for returning guests we've hosted before."}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!canGoPrev}
          onClick={() => setViewMonth((m) => shiftMonth(m, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="text-sm font-medium">{monthLabel(viewMonth)}</p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!canGoNext}
          onClick={() => setViewMonth((m) => shiftMonth(m, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="text-muted-foreground grid grid-cols-7 gap-1 text-center text-[10px] font-medium tracking-wide uppercase">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) =>
              day ? (
                <button
                  key={day.date}
                  type="button"
                  disabled={!review && dayDisabled(day.date, day.available)}
                  tabIndex={review ? -1 : undefined}
                  onClick={review ? undefined : () => onDayClick(day.date)}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-md text-sm transition",
                    review
                      ? "pointer-events-none cursor-default"
                      : day.available && day.date >= today
                        ? "hover:bg-primary/20 cursor-pointer"
                        : "text-muted-foreground cursor-not-allowed",
                    !day.available &&
                      "bg-muted decoration-muted-foreground/40 line-through",
                    inStayNight(day.date, checkIn, checkOut) &&
                      "bg-primary text-primary-foreground hover:bg-primary",
                    isCheckoutDay(day.date, checkOut) &&
                      "ring-primary bg-primary/20 ring-2 ring-inset",
                    checkIn === day.date && checkOut && "rounded-r-none",
                  )}
                >
                  {Number(day.date.slice(8, 10))}
                </button>
              ) : (
                <span key={`e-${wi}-${di}`} className="h-10" aria-hidden />
              ),
            )}
          </div>
        ))}
      </div>

      {review ? null : (
        <button
          type="button"
          className="text-muted-foreground text-left text-xs underline-offset-2 hover:underline"
          onClick={() => {
            setCheckIn(null);
            setCheckOut(null);
            setRangeError(null);
          }}
        >
          Clear dates
        </button>
      )}

      {rangeError && !review ? (
        <p className="text-destructive text-sm">{rangeError}</p>
      ) : null}

      {review ? null : (
        <div className="grid gap-3 border-t pt-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="booking-guests">Guests</Label>
            <Input
              id="booking-guests"
              type="number"
              min={1}
              value={guests}
              onChange={(e) =>
                setGuests(Math.max(1, Number(e.target.value) || 1))
              }
            />
          </div>

          {checkIn && checkOut && !rangeValid ? (
            <p className="text-destructive text-sm">
              Choose a valid stay with only open nights between arrival and
              departure.
            </p>
          ) : null}

          {checkIn && !checkOut ? (
            <p className="text-muted-foreground text-sm">
              Arrival {checkIn}. Now select departure.
            </p>
          ) : null}

          {rangeValid && checkIn && checkOut ? (
            <p className="text-muted-foreground text-sm">
              {checkIn} → {checkOut} · {eachNight(checkIn, checkOut).length}{" "}
              {eachNight(checkIn, checkOut).length === 1 ? "night" : "nights"}
            </p>
          ) : null}

          {continueHref && canBookDirect ? (
            <Link
              href={continueHref}
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
            >
              Book
            </Link>
          ) : continueHref ? (
            <Link
              href={signInHref}
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
            >
              Sign in to book
            </Link>
          ) : (
            <Button type="button" size="lg" disabled className="w-full">
              Book
            </Button>
          )}

          {continueHref && !canBookDirect ? (
            <p className="text-muted-foreground text-xs">
              First stay?{" "}
              {airbnbUrl ? (
                <a className="underline" href={airbnbUrl}>
                  Book on Airbnb
                </a>
              ) : (
                "Contact the host to book your first visit."
              )}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
