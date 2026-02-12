import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  Home, 
  FileText, 
  FolderOpen, 
  Settings,
  ChevronRight,
  CheckCircle2,
  PanelLeftClose,
  PanelLeft,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FLOW_STEPS = [
  { key: 'source_material', label: 'Kildemateriale', subtitle: 'Last opp kilder' },
  { key: 'rammer', label: 'Rammer', subtitle: 'Definer rammer' },
  { key: 'dialog', label: 'Dynamisk intervju', subtitle: 'Svar på spørsmål' },
  { key: 'proposed', label: 'Foreslått brief', subtitle: 'Rediger utkast' },
  { key: 'final', label: 'Ferdig brief', subtitle: 'Se og eksporter' }
];

const STEP_ORDER = ['source_material', 'rammer', 'dialog', 'proposed', 'final'];

export default function SidePanel({ currentPageName, collapsed, onToggleCollapse, briefCurrentStep }) {
  const { isAdmin } = useAuth();

  const navItems = [
    { name: 'Hjem', page: 'Home', icon: Home },
    { name: 'Ny brief', page: 'NewBrief', icon: FileText },
    { name: 'Mine briefs', page: 'BriefList', icon: FolderOpen },
    { name: 'Innstillinger', page: 'Settings', icon: Settings },
  ];

  const adminItems = [
    { name: 'Admin', page: 'AdminThemes', icon: ShieldCheck },
  ];

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

  const completedCount = FLOW_STEPS.filter((_, i) => i < STEP_ORDER.indexOf(briefCurrentStep)).length;
  const progressPercent = isInBriefEditor && briefCurrentStep
    ? Math.round((completedCount / FLOW_STEPS.length) * 100)
    : 0;

  if (collapsed) {
    return (
      <div className="w-16 bg-card border-r border-border flex flex-col items-center py-4 gap-4">
        <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="mb-4">
          <PanelLeft className="h-5 w-5" />
        </Button>
        {navItems.map((item) => (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isCurrentPage(item.page)
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                : "text-muted-foreground hover:bg-muted"
            )}
            title={item.name}
          >
            <item.icon className="h-5 w-5" />
          </Link>
        ))}
        {isAdmin && adminItems.map((item) => (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isCurrentPage(item.page)
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                : "text-muted-foreground hover:bg-muted"
            )}
            title={item.name}
          >
            <item.icon className="h-5 w-5" />
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="w-72 bg-card border-r border-border flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">GS1</span>
          </div>
          <span className="font-semibold text-foreground">Dynamisk Brief</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          <PanelLeftClose className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="p-3 flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isCurrentPage(item.page)
                ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        ))}
        {isAdmin && adminItems.map((item) => (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isCurrentPage(item.page)
                ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* Brief Progress (only when in editor) */}
      {isInBriefEditor && briefCurrentStep && (
        <div className="p-4 border-t border-border flex-1">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Fremdrift
            </h4>
            <span className="text-xs font-medium text-muted-foreground">
              {progressPercent}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-muted rounded-full mb-4 overflow-hidden">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex flex-col gap-1">
            {FLOW_STEPS.map((step, idx) => {
              const status = getFlowStepStatus(step.key);
              return (
                <div 
                  key={step.key} 
                  className={cn(
                    "flex items-center gap-2 py-1.5 px-2 rounded text-sm transition-colors",
                    status === 'current' && "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium",
                    status === 'completed' && "text-green-700 dark:text-green-400",
                    status === 'upcoming' && "text-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0",
                    status === 'current' && "bg-blue-600 text-white",
                    status === 'completed' && "bg-green-600 text-white",
                    status === 'upcoming' && "bg-muted text-muted-foreground"
                  )}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{step.label}</span>
                    {status === 'current' && (
                      <span className="block text-xs text-blue-600/70 dark:text-blue-400/70 truncate">
                        {step.subtitle}
                      </span>
                    )}
                  </div>
                  {status === 'current' && (
                    <ChevronRight className="h-4 w-4 ml-auto flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Help link at bottom */}
      <div className="mt-auto p-3 border-t border-border">
        <Link
          to={createPageUrl('HelpInstructions')}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            isCurrentPage('HelpInstructions')
              ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <HelpCircle className="h-5 w-5" />
          <span>Hjelp</span>
        </Link>
      </div>
    </div>
  );
}
