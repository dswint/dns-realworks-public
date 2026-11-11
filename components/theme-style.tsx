import { themeToCssVars, type ThemeTokens } from "@/lib/theme";

export function ThemeStyle({ theme }: { theme: ThemeTokens }) {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root{${themeToCssVars(theme)}}`,
      }}
    />
  );
}
