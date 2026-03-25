import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  FolderOpen, 
  Settings,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  LayoutDashboard,
  Tags,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FLOW_STEPS = [
  { key: 'source_material', label: 'Kildemateriale' },
  { key: 'rammer', label: 'Rammer' },
  { key: 'dialog', label: 'Dynamisk intervju' },
  { key: 'proposed', label: 'Foreslått brief' },
  { key: 'final', label: 'Ferdig brief' }
];

const STEP_ORDER = ['source_material', 'rammer', 'dialog', 'proposed', 'final'];

export default function SidePanel({ currentPageName, briefCurrentStep, onOpenGuide }) {
  const { isAdmin, user } = useAuth();

  const mainNavItems = [
    { name: 'Mine briefer', page: 'Home', icon: LayoutDashboard },
    { name: 'Briefoversikt', page: 'BriefList', icon: FolderOpen },
    { name: 'Innstillinger', page: 'Settings', icon: Settings },
  ];

  const adminNavItems = isAdmin ? [
    { name: 'Brieftemaer', page: 'AdminThemes', icon: Tags },
  ] : [];

  const isCurrentPage = (pageName) => currentPageName === pageName;
  const isInBriefEditor = currentPageName === 'BriefEditor';

  const getFlowStepStatus = (stepKey) => {
    if (!isInBriefEditor || !briefCurrentStep) return 'upcoming';
    
    const currentIdx = STEP_ORDER.indexOf(briefCurrentStep);
    const stepIdx = STEP_ORDER.indexOf(stepKey);
    
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'current';
    return 'upcoming';
  };

  return (
    <div className="w-72 bg-white border-r border-[#B1B3B3] flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-[#B1B3B3] flex items-center space-x-2">
        <div className="w-8 h-8 bg-[#002C6C] rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">GS1</span>
        </div>
        <span className="font-semibold text-[#454545]">Dynamisk Brief</span>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {/* Main nav */}
        {mainNavItems.map((item) => (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isCurrentPage(item.page)
                ? "bg-[#002C6C]/10 text-[#002C6C] font-semibold"
                : "text-[#454545] hover:bg-[#F4F4F4]"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span>{item.name}</span>
          </Link>
        ))}

        {/* Admin section */}
        {adminNavItems.length > 0 && (
          <>
            <div className="pt-2 pb-1 px-3">
              <div className="border-t border-[#B1B3B3]" />
              <p className="text-xs text-[#888B8D] font-medium uppercase tracking-wider mt-2">Administrasjon</p>
            </div>
            {adminNavItems.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isCurrentPage(item.page)
                    ? "bg-[#002C6C]/10 text-[#002C6C] font-semibold"
                    : "text-[#454545] hover:bg-[#F4F4F4]"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Brief Progress (only when in editor) */}
      {isInBriefEditor && briefCurrentStep && (
        <div className="p-4 border-t border-[#B1B3B3] flex-1">
          <h4 className="text-xs font-semibold text-[#888B8D] uppercase tracking-wider mb-3">
            Fremdrift
          </h4>
          <div className="space-y-1">
            {FLOW_STEPS.map((step, idx) => {
              const status = getFlowStepStatus(step.key);
              return (
                <div 
                  key={step.key} 
                  className={cn(
                    "flex items-center space-x-2 py-1.5 px-2 rounded text-sm transition-colors",
                    status === 'current' && "bg-[#F26334]/10 text-[#F26334] font-medium",
                    status === 'completed' && "text-[#002C6C]",
                    status === 'upcoming' && "text-[#B1B3B3]"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0",
                    status === 'current' && "bg-[#F26334] text-white",
                    status === 'completed' && "bg-[#002C6C] text-white",
                    status === 'upcoming' && "bg-[#B1B3B3] text-white"
                  )}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span>{step.label}</span>
                  {status === 'current' && (
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User + Settings footer */}
      <div className="mt-auto border-t border-[#B1B3B3]">
        <Link
          to={createPageUrl('Settings')}
          className={`flex items-center space-x-3 px-4 py-3 transition-colors hover:bg-[#F4F4F4] ${isCurrentPage('Settings') ? 'bg-[#002C6C]/10' : ''}`}
        >
          <div className="w-8 h-8 rounded-full bg-[#002C6C] flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-white">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#454545] truncate">{user?.full_name || user?.email || 'Bruker'}</p>
            <p className="text-xs text-[#888B8D]">Innstillinger</p>
          </div>
          <Settings className="h-4 w-4 text-[#888B8D] flex-shrink-0" />
        </Link>
        <p className="text-xs text-[#B1B3B3] text-center pb-2">v1.2.0</p>
      </div>
    </div>
  );
}