-- Tenant zero. Adding another host is another companies row.

insert into companies (
  name,
  slug,
  custom_domain,
  plan,
  status,
  wordmark,
  wordmark_sub,
  tagline,
  theme
) values (
  'DNS Realworks',
  'dns-realworks',
  'dnsrealworks.com',
  'flagship',
  'active',
  'DNS Realworks',
  'Owned stays',
  'Houses we own, kept with care.',
  '{
    "color": {
      "background": "#f3efe6",
      "foreground": "#1c1914",
      "card": "#fffdf8",
      "cardForeground": "#1c1914",
      "popover": "#fffdf8",
      "popoverForeground": "#1c1914",
      "primary": "#6b4f2a",
      "primaryForeground": "#fffdf8",
      "secondary": "#e8e1d4",
      "secondaryForeground": "#1c1914",
      "muted": "#e8e1d4",
      "mutedForeground": "#6f675c",
      "accent": "#e8e1d4",
      "accentForeground": "#1c1914",
      "destructive": "#b42318",
      "border": "#d9d0c0",
      "input": "#cfc5b4",
      "ring": "#6b4f2a"
    },
    "font": { "display": "fraunces", "body": "figtree", "eyebrow": "figtree" },
    "radius": "0.5rem",
    "spacing": { "unit": "0.25rem" },
    "elevation": { "card": "0 1px 2px rgb(28 25 20 / 0.06)" },
    "photography": { "treatment": "warm" }
  }'::jsonb
);

insert into pages (company_id, slug, title, status, template, position)
select id, 'home', 'Home', 'published', 'home', 0 from companies where slug = 'dns-realworks';

insert into pages (company_id, slug, title, status, template, position)
select id, 'about', 'About', 'published', 'inner', 1 from companies where slug = 'dns-realworks';

insert into pages (company_id, slug, title, status, template, position)
select id, 'contact', 'Contact', 'published', 'inner', 2 from companies where slug = 'dns-realworks';

insert into blocks (company_id, page_id, type, position, data)
select
  c.id,
  p.id,
  'homeHero',
  0,
  jsonb_build_object(
    'eyebrow', 'Owned stays',
    'title', 'Houses we own, kept with care.',
    'body', 'DNS Realworks is a small portfolio of properties we operate ourselves. Browse the collection. Returning guests may book with us directly.'
  )
from companies c
join pages p on p.company_id = c.id and p.slug = 'home'
where c.slug = 'dns-realworks';

insert into blocks (company_id, page_id, type, position, data)
select
  c.id,
  p.id,
  'richText',
  0,
  jsonb_build_object(
    'title', 'About',
    'body', 'We buy, restore, and host a handful of houses. The brand is the operator. The properties are the assets.'
  )
from companies c
join pages p on p.company_id = c.id and p.slug = 'about'
where c.slug = 'dns-realworks';

insert into blocks (company_id, page_id, type, position, data)
select
  c.id,
  p.id,
  'contactPanel',
  0,
  jsonb_build_object(
    'title', 'Contact',
    'body', 'Questions about a stay or a property? Write us.'
  )
from companies c
join pages p on p.company_id = c.id and p.slug = 'contact'
where c.slug = 'dns-realworks';
