"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BookLink() {
  const pathname = usePathname();
  const match = pathname.match(/^\/properties\/([^/]+)/);
  const href = match
    ? `/properties/${match[1]}#availability`
    : "/properties";
  return (
    <Link href={href} className={cn(buttonVariants({ size: "lg" }))}>
      Book
    </Link>
  );
}
