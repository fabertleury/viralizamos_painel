import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// Rotas que não precisam de autenticação
const publicRoutes = ['/login', '/api/auth', '/favicon.ico', '/_next'];

export async function middleware(request: NextRequest) {
  // Verifica se a rota é pública
  if (publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;

  // Se não há token, redireciona para login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Verifica o token usando o JWT_SECRET existente
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jose.jwtVerify(token, secret);
    
    return NextResponse.next();
  } catch (error) {
    // Se o token for inválido, remove o cookie e redireciona para login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_token');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 