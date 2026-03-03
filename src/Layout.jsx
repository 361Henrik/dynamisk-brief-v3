import React, { useState, useEffect } from 'react';
// GS1 brand colors: #002C6C (blue), #F26334 (orange), #454545 (dark gray), #888B8D (medium gray), #B1B3B3 (light gray), #F4F4F4 (bg)
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { GuideProvider, useGuide } from '@/components/onboarding/GuideContext.jsx';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import SidePanel from '@/components/layout/SidePanel';
import { 
  LogOut,
  Menu,
  X,
  ChevronDown
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
  const { open: isOpen, openGuide, closeGuide } = useGuide();
  const [sidePanelCollapsed, setSidePanelCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidePanelCollapsed') === 'true';
    }
    return false;
  });
  // Dark mode removed - light mode only
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    localStorage.setItem('sidePanelCollapsed', sidePanelCollapsed);
  }, [sidePanelCollapsed]);

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex">
      <OnboardingModal open={isOpen} onDismiss={closeGuide} />

      {/* Desktop Side Panel */}
      <div className="hidden md:flex h-screen sticky top-0">
        <SidePanel 
          currentPageName={currentPageName} 
          collapsed={sidePanelCollapsed}
          onToggleCollapse={() => setSidePanelCollapsed(!sidePanelCollapsed)}
          briefCurrentStep={briefCurrentStep}
          onOpenGuide={openGuide}
        />
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-[#B1B3B3] sticky top-0 z-50">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14">
              {/* Mobile Logo */}
              <Link to={createPageUrl('Home')} className="flex items-center space-x-2 md:hidden">
                <div className="w-8 h-8 bg-[#002C6C] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">GS1</span>
                </div>
                <span className="font-semibold text-[#454545]">Dynamisk Brief</span>
              </Link>

              {/* Desktop spacer */}
              <div className="hidden md:block" />

              {/* User Menu */}
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-[#002C6C] rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {user?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                        </span>
                      </div>
                      <span className="hidden sm:block text-sm text-[#454545]">{user?.full_name || user?.email}</span>
                      <ChevronDown className="h-3 w-3 text-[#888B8D]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-[#454545]">{user?.full_name || 'Bruker'}</p>
                      <p className="text-xs text-[#888B8D]">{user?.email}</p>
                      <p className="text-xs text-[#002C6C] capitalize mt-1">{user?.role || 'fagperson'}</p>
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
            <div className="w-72 h-full bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <SidePanel 
                currentPageName={currentPageName} 
                collapsed={false}
                onToggleCollapse={() => setMobileMenuOpen(false)}
                briefCurrentStep={briefCurrentStep}
                onOpenGuide={openGuide}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 text-[#454545]">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName, briefCurrentStep }) {
  return (
    <AuthProvider>
      <GuideProvider>
        <NavigationContent currentPageName={currentPageName} briefCurrentStep={briefCurrentStep}>
          {children}
        </NavigationContent>
      </GuideProvider>
    </AuthProvider>
  );
}