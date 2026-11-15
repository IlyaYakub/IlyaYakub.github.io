import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../consts';
import { getEntries, entryHref, entryTitle } from '../lib/entries';

export async function GET(context: APIContext) {
  const entries = await getEntries();
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site!,
    items: entries.map((e) => ({
      title: entryTitle(e),
      pubDate: e.data.date,
      description: e.data.description,
      link: entryHref(e),
      categories: [e.data.type, ...e.data.tags],
    })),
  });
}
