import { getCollection, type CollectionEntry } from 'astro:content';

export type Entry = CollectionEntry<'entries'>;

export async function getEntries(): Promise<Entry[]> {
  const all = await getCollection('entries', (e) => import.meta.env.DEV || !e.data.draft);
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** A project opens its topic, like a playlist cover, and stays first. */
export function projectsFirst(entries: Entry[]): Entry[] {
  return [...entries.filter((e) => e.data.type === 'project'), ...entries.filter((e) => e.data.type !== 'project')];
}

export function getTopics(entries: Entry[]): string[] {
  return [...new Set(entries.flatMap((e) => (e.data.topic ? [e.data.topic] : [])))].sort();
}

/** Posts may have no title: fall back to the start of the text. */
export function entryTitle(e: Entry): string {
  if (e.data.title) return e.data.title;
  const text = (e.body ?? '').replace(/[#*_`>\[\]()]/g, '').replace(/\s+/g, ' ').trim();
  return text.length > 60 ? text.slice(0, 60) + '…' : text;
}

export function entryHref(e: Entry): string {
  return `/e/${e.id}`;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
