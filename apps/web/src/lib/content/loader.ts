import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {
  docFrontmatterSchema,
  featureFrontmatterSchema,
  type DocFrontmatter,
  type FeatureFrontmatter,
} from './schema';

// Build-cwd assumption: process.cwd() is `apps/web` at both `next build` and
// `next start` — the same assumption the existing `_og/fonts` loader relies on
// (Vercel Root Directory = `apps/web`, verified). Tests pass an explicit dir.
const FEATURE_DIR = path.join(process.cwd(), 'src/app/features/[mode]/_content');
const DOCS_DIR = path.join(process.cwd(), 'src/content/docs');

function read(dir: string, file: string): string {
  const full = path.resolve(dir, file);
  // Path-traversal guard — the resolved file must stay inside the base dir.
  if (!full.startsWith(path.resolve(dir) + path.sep)) {
    throw new Error(`Illegal content path: ${file}`);
  }
  if (!fs.existsSync(full)) throw new Error(`Content not found: ${file}`);
  return fs.readFileSync(full, 'utf8');
}

export function getModeFrontmatter(slug: string, dir = FEATURE_DIR): FeatureFrontmatter {
  const { data } = matter(read(dir, `${slug}.mdx`));
  return featureFrontmatterSchema.parse(data);
}

export function getDocFrontmatter(slug: string[], dir = DOCS_DIR): DocFrontmatter {
  const file = `${slug.join('-')}.mdx`;
  const { data } = matter(read(dir, file));
  return docFrontmatterSchema.parse(data);
}

export function getAllDocSlugs(dir = DOCS_DIR): string[][] {
  const isProd = process.env.NODE_ENV === 'production';
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => docFrontmatterSchema.parse(matter(read(dir, f)).data))
    .filter((fm) => !(isProd && fm.draft))
    .map((fm) => fm.slug);
}
