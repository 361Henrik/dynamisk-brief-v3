import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Home, 
  FileText, 
  FolderOpen, 
  Settings,
  BookOpen,
  ChevronRight,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PanelLeftClose,
  PanelLeft,
  HelpCircle,
  ShieldCheck,
  BookMarked
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

export default function SidePanel({ currentPageName, collapsed, onToggleCollapse, briefCurrentStep, onOpenGuide }) {
  const { isAdmin } = useAuth();

  const { data: briefTemplate } = useQuery({
    queryKey: ['briefTemplate'],
    queryFn: async () => {
      const templates = await base44.entities.KnowledgeBaseDoc.filter({ 
        docType: 'brief_template', 
        isActive: true 
      });
      return templates[0] || null;
    }
  });

  const navItems = [
    { name: 'Slik fungerer det', icon: BookMarked, onClick: onOpenGuide },
    { name: 'Oversikt Briefs', page: 'Home', icon: Home },
    ...(isAdmin ? [{ name: 'Temaer', page: 'AdminThemes', icon: ShieldCheck }] : []),
    { name: 'Dynamisk brief', page: 'NewBrief', icon: FileText },
    { name: 'Mine briefs', page: 'BriefList', icon: FolderOpen },
    { name: 'Instruksjoner', page: 'HelpInstructions', icon: HelpCircle },
    { name: 'Innstillinger', page: 'Settings', icon: Settings },
  ];

  const adminItems = [];

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

  if (collapsed) {
    return (
      <div className="w-16 bg-white border-r border-[#B1B3B3] flex flex-col items-center py-4 space-y-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
        {navItems.map((item) => (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isCurrentPage(item.page)
                ? "bg-[#002C6C]/10 text-[#002C6C]"
                : "text-[#454545] hover:bg-[#F4F4F4]"
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
    <div className="w-72 bg-white border-r border-[#B1B3B3] flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-[#B1B3B3] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-[#002C6C] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">GS1</span>
          </div>
          <span className="font-semibold text-[#454545]">Dynamisk Brief</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          <PanelLeftClose className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) =>
          item.onClick ? (
            <button
              key={item.name}
              onClick={item.onClick}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-[#002C6C] hover:bg-[#002C6C]/10"
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.name}</span>
            </button>
          ) : (
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
          )
        )}
      </nav>

      {/* Briefmal Section */}
      <div className="p-4 border-t border-[#B1B3B3]">
        <div className="flex items-center space-x-2 mb-2">
          <BookOpen className="h-5 w-5 text-[#002C6C]" />
          <h3 className="font-semibold text-[#454545]">Briefmal</h3>
        </div>
        <p className="text-xs text-[#888B8D] mb-3">
          Briefmalen definerer hvilke hovedpunkter som skal fylles ut i intervjuet og strukturen på den ferdige briefen.
        </p>

        {/* Brief Template Status */}
        <div className="bg-[#F4F4F4] rounded-lg p-3 mb-3">
          {briefTemplate ? (
            <div>
              <div className="flex items-start space-x-2 mb-3">
                {briefTemplate.extractionStatus === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                ) : briefTemplate.extractionStatus === 'pending' ? (
                  <Loader2 className="h-4 w-4 text-yellow-600 animate-spin mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#454545] truncate">
                    {briefTemplate.title}
                  </p>
                  <p className="text-xs text-[#888B8D]">
                    {briefTemplate.extractionStatus === 'success' 
                      ? 'Klar til bruk' 
                      : briefTemplate.extractionStatus === 'pending' 
                      ? 'Behandles...' 
                      : 'Feil ved behandling'}
                  </p>
                </div>
              </div>

              {/* Hovedkategorier list */}
              {briefTemplate.extractionStatus === 'success' && (
                <div className="border-t border-[#B1B3B3] pt-2">
                  <p className="text-xs font-medium text-[#454545] mb-2">Hovedkategorier:</p>
                  <ul className="text-xs text-[#888B8D] space-y-1">
                    <li className="flex items-center gap-1.5"><span className="w-1 h-1 bg-gray-400 rounded-full" />Prosjektinformasjon</li>
                    <li className="flex items-center gap-1.5"><span className="w-1 h-1 bg-gray-400 rounded-full" />Bakgrunn og situasjonsbeskrivelse</li>
                    <li className="flex items-center gap-1.5"><span className="w-1 h-1 bg-gray-400 rounded-full" />Mål og suksesskriterier</li>
                    <li className="flex items-center gap-1.5"><span className="w-1 h-1 bg-gray-400 rounded-full" />Målgrupper</li>
                    <li className="flex items-center gap-1.5"><span className="w-1 h-1 bg-gray-400 rounded-full" />GS1-tilbudet og verdiforslag</li>
                    <li className="flex items-center gap-1.5"><span className="w-1 h-1 bg-gray-400 rounded-full" />Budskap, tone og stil</li>
                    <li className="flex items-center gap-1.5"><span className="w-1 h-1 bg-gray-400 rounded-full" />Leveranser og kanaler</li>
                    <li className="flex items-center gap-1.5"><span className="w-1 h-1 bg-gray-400 rounded-full" />Praktiske rammer og godkjenning</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#F26334]">
              Ingen briefmal lastet opp ennå.
            </p>
          )}
        </div>

        {/* File reference */}
        {briefTemplate && briefTemplate.extractionStatus === 'success' && (
          <p className="text-xs text-[#888B8D] mb-3">
            Gjeldende briefmal: <span className="font-medium">{briefTemplate.title}</span> (PDF)
          </p>
        )}

        {isAdmin && (
          <div>
            <Link to={createPageUrl('AdminBriefmal')}>
              <Button variant="outline" size="sm" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Last opp ny briefmal
              </Button>
            </Link>
            <p className="text-xs text-[#B1B3B3] mt-1.5 text-center">
              Opplasting av ny briefmal erstatter gjeldende mal.
            </p>
          </div>
        )}
      </div>

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
                    status === 'current' && "bg-[#002C6C] text-white",
                    status === 'completed' && "bg-green-600 text-white",
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
    </div>
  );
}