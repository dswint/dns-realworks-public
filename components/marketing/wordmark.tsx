import Link from "next/link";

export function Wordmark({
  name,
  sub,
  href = "/",
}: {
  name: string;
  sub?: string | null;
  href?: string;
}) {
  return (
    <Link href={href} className="group block">
      <span className="font-heading text-lg tracking-tight">{name}</span>
      {sub ? (
        <span className="text-muted-foreground mt-0.5 block text-[10px] font-medium tracking-[0.18em] uppercase">
          {sub}
        </span>
      ) : null}
    </Link>
  );
}
