import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

// Rotas que não precisam de autenticação
const publicRoutes = ['/login', '/api/auth', '/favicon.ico', '/_next'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirecionar /_not-found para /not-found
  if (pathname === '/_not-found') {
    return NextResponse.redirect(new URL('/not-found', request.url));
  }

  // Redirecionar /reposicoes/page para /reposicoes
  if (pathname === '/reposicoes/page' || pathname.startsWith('/reposicoes/page/')) {
    return NextResponse.redirect(new URL('/reposicoes', request.url));
  }

  // Se tiver um token no cookie, confirma autenticação
  const token = request.cookies.get('admin_token')?.value;
  
  // Checar se é uma rota protegida
  if (
    pathname.startsWith('/painel') || 
    pathname.startsWith('/dashboard') || 
    pathname === '/' || 
    pathname === ''
  ) {
    // Se não tiver token, redireciona para login
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

// Configurar em quais paths o middleware será executado
export const config = {
  matcher: [
    '/',
    '/_not-found',
    '/reposicoes/page',
    '/reposicoes/page/:path*',
    '/painel/:path*',
    '/dashboard/:path*',
  ],
}; 