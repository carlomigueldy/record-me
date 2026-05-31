// Vitest stub for .mdx imports. MDX compilation is a build-time concern
// (@next/mdx + webpack); unit tests only need the import to resolve, not render.
// The default export is a no-op React component matching the MDX output shape.
export default function MdxStub() {
  return null;
}
