'use client';

import Link from 'next/link';
import type { ComponentProps, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';

type TransitionLinkProps = ComponentProps<typeof Link>;

/**
 * TransitionLink — a drop-in replacement for `next/link` that wraps client-side
 * navigation in `document.startViewTransition` so a same-document crossfade
 * plays where the browser supports it.
 *
 * Progressive enhancement, by design:
 * - Renders a real `<Link>` (a real `<a href>`), so navigation works with JS
 *   disabled and in browsers without the View Transitions API.
 * - Only intercepts plain left-clicks; modified clicks (cmd/ctrl/shift/middle,
 *   `target=_blank`, default-prevented) fall through to the native anchor.
 * - This is deliberately decoupled from any Next experimental config: a change
 *   to Next's view-transition API cannot break navigation here.
 */
export function TransitionLink({ href, onClick, target, ...rest }: TransitionLinkProps) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    // Feature-detect at runtime — not every browser ships the View Transitions
    // API even though it is now in the TS DOM lib.
    const supportsViewTransitions = typeof document.startViewTransition === 'function';

    // Let the browser handle anything we should not hijack.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      (target && target !== '_self') ||
      !supportsViewTransitions
    ) {
      return;
    }

    // Same-document, supported browser: take over and crossfade.
    event.preventDefault();
    const url = typeof href === 'string' ? href : href.toString();
    document.startViewTransition(() => {
      router.push(url);
    });
  }

  return <Link href={href} target={target} onClick={handleClick} {...rest} />;
}
