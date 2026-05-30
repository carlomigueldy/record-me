type ChangelogEntry = {
  version: string;
  date: string; // ISO yyyy-mm-dd
  title: string;
  summary: string;
  highlights: string[];
};

const changelog: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: '2026-05-30',
    title: 'record me, version one',
    summary:
      'A browser-native recording instrument with three modes, composed locally and downloaded to disk. No accounts. No upload.',
    highlights: [
      'Three modes — Screen + Camera + Cursor, Screen + Cursor, and Camera only.',
      'Everything runs in the browser; recordings never touch a server.',
      'Live composite preview, stop-and-review, and direct download.',
      'Cookieless, anonymous analytics — your content is never measured.',
    ],
  },
];

export { changelog };
export type { ChangelogEntry };
