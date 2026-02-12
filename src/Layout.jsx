import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import SidePanel from '@/components/layout/SidePanel';
import ErrorBoundary from '@/components/ErrorBoundary';
import { 
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sun,
  Moon,
  Home,
  FileText,
  FolderOpen,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function NavigationContent({ currentPageName, children, briefCurrentStep }) {
  const { user, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidePanelCollapsed, setSidePanelCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidePanelCollapsed') === 'true';
    }
    return false;
  });
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('sidePanelCollapsed', sidePanelCollapsed);
  }, [sidePanelCollapsed]);

  return (
    <div className="min-h-screen bg-background transition-colors flex">
      {/* Desktop Side Panel */}
      <div className="hidden md:flex h-screen sticky top-0">
        <SidePanel 
          currentPageName={currentPageName} 
          collapsed={sidePanelCollapsed}
          onToggleCollapse={() => setSidePanelCollapsed(!sidePanelCollapsed)}
          briefCurrentStep={briefCurrentStep}
        />
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-50">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14">
              {/* Mobile Logo */}
              <Link to={createPageUrl('Home')} className="flex items-center space-x-2 md:hidden">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">GS1</span>
                </div>
                <span className="font-semibold text-foreground">Dynamisk Brief</span>
              </Link>

              {/* Desktop spacer */}
              <div className="hidden md:block" />

              {/* User Menu */}
              <div className="flex items-center space-x-2">
                {/* Dark Mode Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDarkMode(!darkMode)}
                  className="text-muted-foreground"
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-200">
                          {user?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                        </span>
                      </div>
                      <span className="hidden sm:block text-sm text-gray-700 dark:text-gray-300">{user?.full_name || user?.email}</span>
                      <ChevronDown className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.full_name || 'Bruker'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 capitalize mt-1">{user?.role || 'fagperson'}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logg ut
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-72 h-full bg-white dark:bg-gray-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <SidePanel 
                currentPageName={currentPageName} 
                collapsed={false}
                onToggleCollapse={() => setMobileMenuOpen(false)}
                briefCurrentStep={briefCurrentStep}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6 text-foreground">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
          <div className="flex items-center justify-around h-14">
            {[
              { name: 'Hjem', page: 'Home', icon: Home },
              { name: 'Ny brief', page: 'NewBrief', icon: FileText },
              { name: 'Mine briefs', page: 'BriefList', icon: FolderOpen },
              { name: 'Innstillinger', page: 'Settings', icon: Settings },
            ].map((item) => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-muted-foreground'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName, briefCurrentStep }) {
  return (
    <AuthProvider>
      <NavigationContent currentPageName={currentPageName} briefCurrentStep={briefCurrentStep}>
        {children}
      </NavigationContent>
    </AuthProvider>
  );
}
