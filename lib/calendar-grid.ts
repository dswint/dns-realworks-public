export type CalendarDayCell = {
  date: string;
  available: boolean;
};

export const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function monthKeyFromDate(iso: string) {
  return iso.slice(0, 7);
}

export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function weeksForMonth(ym: string, days: CalendarDayCell[]) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const byDate = new Map(days.map((d) => [d.date, d]));
  const cells: (CalendarDayCell | null)[] = [];
  for (let i = 0; i < first.getUTCDay(); i++) cells.push(null);
  for (let d = 1; d <= last.getUTCDate(); d++) {
    const iso = `${ym}-${String(d).padStart(2, "0")}`;
    cells.push(
      byDate.get(iso) ?? {
        date: iso,
        available: false,
      },
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (CalendarDayCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
