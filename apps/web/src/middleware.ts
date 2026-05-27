import { NextResponse, type NextRequest } from 'next/server';

// Belt-and-suspenders: the /dev/* layout also calls notFound() in production,
// but a layout-level notFound() does not prevent Next from rendering the page
// and streaming its full RSC payload in the response body alongside the 404
// status. Middleware runs *before* the route handler, so a NextResponse here
// short-circuits the render pipeline entirely — body is the empty 404 chrome,
// not the leaked primitives showcase.
export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && request.nextUrl.pathname.startsWith('/dev/')) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/dev/:path*',
};
