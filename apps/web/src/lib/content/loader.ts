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

/**
 * getAllDocs — single-read source of truth for doc discovery.
 *
 * Returns all parsed DocFrontmatter records from `dir`, optionally dropping
 * drafts in production. This is the ONLY place the filesystem is enumerated;
 * callers must not re-read by slug (which would derive the filename from
 * frontmatter `slug`, creating a slug≠filename drift window where a draft doc
 * could be published in production — spec §10 "dual-read drift" risk).
 *
 * MAJOR 1 guard: returns [] when the directory doesn't exist so a clean
 * git checkout (which drops empty tracked dirs) doesn't ENOENT on CI.
 * A `.gitkeep` in `src/content/docs/` provides belt-and-suspenders for
 * the real production dir; Task 7 fills it with real docs.
 *
 * Basename invariant: asserts that each file's basename (without .mdx)
 * matches `fm.slug.join('-')`. Throws on mismatch to prevent the
 * dual-read drift — a doc whose frontmatter slug differs from its filename
 * would route correctly but re-read the wrong file during allDocs(). Fail
 * loud at discovery rather than silently serving the wrong content.
 */
export function getAllDocs(dir = DOCS_DIR): DocFrontmatter[] {
  // MAJOR 1: clean-checkout guard — git drops empty dirs; Task 7 fills this.
  if (!fs.existsSync(dir)) return [];

  const isProd = process.env.NODE_ENV === 'production';
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.mdx') && f !== '.gitkeep')
    .map((f) => {
      const fm = docFrontmatterSchema.parse(matter(read(dir, f)).data);
      // MAJOR 2 invariant: filename (without .mdx) must equal slug.join('-').
      const basename = f.slice(0, -'.mdx'.length);
      const slugKey = fm.slug.join('-');
      if (basename !== slugKey) {
        throw new Error(
          `Content file name mismatch: "${f}" has frontmatter slug "${slugKey}" — rename the file to "${slugKey}.mdx"`,
        );
      }
      return fm;
    })
    .filter((fm) => !(isProd && fm.draft));
}

/**
 * getAllDocSlugs — returns only the slug arrays (routing / generateStaticParams).
 * Thin wrapper over getAllDocs; callers that need full frontmatter should call
 * getAllDocs() directly (avoids a second fs.readdirSync).
 */
export function getAllDocSlugs(dir = DOCS_DIR): string[][] {
  return getAllDocs(dir).map((fm) => fm.slug);
}
