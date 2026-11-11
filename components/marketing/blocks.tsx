import { blockText, type CmsPage } from "@/lib/cms";

export function BlockList({ page }: { page: CmsPage }) {
  return (
    <div className="space-y-16">
      {page.blocks.map((block) => {
        const title = blockText(block, "title", page.title);
        const body = blockText(block, "body");
        const eyebrow = blockText(block, "eyebrow");
        if (block.type === "homeHero") {
          return (
            <section key={block.id} className="max-w-3xl">
              {eyebrow ? (
                <p className="text-primary mb-3 text-[11px] font-semibold tracking-[0.2em] uppercase">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="text-4xl leading-tight sm:text-6xl">{title}</h1>
              {body ? (
                <p className="text-muted-foreground mt-6 max-w-xl text-lg">
                  {body}
                </p>
              ) : null}
            </section>
          );
        }
        return (
          <section key={block.id} className="max-w-2xl">
            <h2 className="text-3xl">{title}</h2>
            {body ? (
              <p className="text-muted-foreground mt-4 text-base leading-relaxed">
                {body}
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
