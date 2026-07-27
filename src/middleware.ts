import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas — sem autenticação
  if (pathname.startsWith('/login'))       return NextResponse.next();
  if (pathname.startsWith('/registro'))    return NextResponse.next();
  if (pathname.startsWith('/confirmacao')) return NextResponse.next();

  // Cookie httpOnly definido pelo Server Action após validar no backend.
  const auth = request.cookies.get('giro_auth')?.value;
  if (!auth) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
