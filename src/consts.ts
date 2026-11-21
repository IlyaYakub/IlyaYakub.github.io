export const SITE = {
  name: 'STDOUT',
  description: 'Notes, thoughts, projects and links. Everything I print to the world.',
  socials: [{ label: 'GitHub', href: 'https://github.com/IlyaYakub' }],
};

export const TYPES = ['section', 'note', 'post', 'project', 'link'] as const;
export type EntryType = (typeof TYPES)[number];
