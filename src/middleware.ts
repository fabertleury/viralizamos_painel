import { NextRequest, NextResponse } from 'next/server';

// Rotas que não precisam de autenticação
const publicRoutes = ['/login', '/api/auth', '/favicon.ico', '/_next'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirecionar qualquer acesso à página de reposições para o dashboard (temporário)
  if (pathname.startsWith('/reposicoes')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Verificar se a rota atual é uma API (prefixo /api)
  const isApiRoute = pathname.startsWith('/api/');
  
  // Ignorar as rotas de API, exceto as que precisam de autenticação
  if (isApiRoute && !pathname.startsWith('/api/admin/')) {
    return NextResponse.next();
  }

  // Ignorar rotas públicas
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Se tiver um token no cookie, confirma autenticação
  const token = request.cookies.get('auth_token')?.value;
  
  // Checar se é uma rota protegida
  if (
    pathname.startsWith('/painel') || 
    pathname.startsWith('/dashboard') || 
    pathname === '/' || 
    pathname === '' ||
    pathname.startsWith('/api/admin/') ||
    pathname.startsWith('/usuarios') ||
    pathname.startsWith('/pedidos') ||
    pathname.startsWith('/transacoes') ||
    pathname.startsWith('/logs')
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
    '/reposicoes/:path*',
    '/painel/:path*',
    '/dashboard/:path*',
    '/api/admin/:path*',
    '/usuarios/:path*',
    '/pedidos/:path*',
    '/transacoes/:path*',
    '/logs/:path*',
    '/login',
  ],
}; 