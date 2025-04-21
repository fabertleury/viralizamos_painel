import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  DollarSign,
  ShoppingCart,
  Users,
  Settings,
  Bell,
  LogOut,
  Menu as MenuIcon,
  ChevronDown,
  X,
  RefreshCw,
  FileText,
  UserPlus,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';

// Interfaces
interface LinkItemProps {
  name: string;
  icon: React.ElementType;
  href: string;
}

const LinkItems: Array<LinkItemProps> = [
  { name: 'Dashboard', icon: Home, href: '/dashboard' },
  { name: 'Transações', icon: DollarSign, href: '/transacoes' },
  { name: 'Pedidos', icon: ShoppingCart, href: '/pedidos' },
  { name: 'Reposições', icon: RefreshCw, href: '/reposicoes' },
  { name: 'Usuários', icon: Users, href: '/usuarios' },
  { name: 'Logs', icon: AlertCircle, href: '/logs' },
  { name: 'Documentação API', icon: FileText, href: '/api-docs' },
  { name: 'Adicionar Admin', icon: UserPlus, href: '/admin/adicionar' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar para desktop */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 overflow-y-auto bg-white border-r border-gray-200 md:block">
        <SidebarContent />
      </aside>
      
      {/* Sidebar móvel */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black bg-opacity-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transition-transform duration-300 transform bg-white border-r border-gray-200 md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="absolute top-0 right-0 p-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <SidebarContent />
      </aside>
      
      {/* Conteúdo principal */}
      <div className="md:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          
          <div className="md:hidden font-bold text-primary text-xl">Viralizamos</div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
            </Button>
            
            <div className="relative">
              <div className="flex items-center space-x-2 cursor-pointer">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  <img src="https://i.pravatar.cc/150?img=29" alt="Avatar" />
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium">Administrador</div>
                  <div className="text-xs text-gray-500">Admin</div>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </div>
            </div>
          </div>
        </header>
        
        {/* Conteúdo da página */}
        <main className="p-4">
          {children}
        </main>
      </div>
    </div>
  );
}

const SidebarContent = () => {
  const pathname = usePathname();
  
  return (
    <div className="py-4">
      <div className="flex items-center justify-center mb-8">
        <span className="text-xl font-bold text-primary">Viralizamos</span>
      </div>
      
      <nav className="px-2">
        {LinkItems.map((link) => (
          <NavItem 
            key={link.name} 
            icon={link.icon} 
            href={link.href}
            isActive={pathname === link.href}
          >
            {link.name}
          </NavItem>
        ))}
      </nav>
    </div>
  );
};

interface NavItemProps {
  icon: React.ElementType;
  children: string;
  href: string;
  isActive?: boolean;
}

const NavItem = ({ icon: Icon, children, href, isActive }: NavItemProps) => {
  return (
    <Link href={href} className="block">
      <div
        className={cn(
          "flex items-center px-4 py-3 mb-1 text-sm font-medium rounded-md transition-colors",
          isActive 
            ? "bg-primary text-white" 
            : "text-gray-700 hover:bg-gray-100"
        )}
      >
        <Icon className="mr-3 h-5 w-5" />
        {children}
      </div>
    </Link>
  );
}; 