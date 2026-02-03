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
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FLOW_STEPS = [
  { key: 'theme', label: 'Tema' },
  { key: 'source_material', label: 'Kildemateriale' },
  { key: 'rammer', label: 'Rammer' },
  { key: 'dialog', label: 'AI-dialog' },
  { key: 'confirm', label: 'Avklaring og bekreftelse' },
  { key: 'final', label: 'Ferdig brief' },
  { key: 'export', label: 'Word-eksport' }
];

const STEP_MAP = {
  'source_material': 'source_material',
  'rammer': 'rammer',
  'dialog': 'dialog',
  'final': 'final'
};

export default function SidePanel({ currentPageName, collapsed, onToggleCollapse, briefCurrentStep }) {
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
    { name: 'Hjem', page: 'Home', icon: Home },
    { name: 'Dynamisk brief', page: 'NewBrief', icon: FileText },
    { name: 'Mine briefs', page: 'BriefList', icon: FolderOpen },
    { name: 'Hjelp & Instruksjoner', page: 'HelpInstructions', icon: HelpCircle },
  ];

  const adminItems = [
    { name: 'Admin', page: 'AdminThemes', icon: Settings },
  ];

  const isCurrentPage = (pageName) => currentPageName === pageName;
  const isInBriefEditor = currentPageName === 'BriefEditor';

  const getFlowStepStatus = (stepKey) => {
    if (!isInBriefEditor || !briefCurrentStep) return 'upcoming';
    
    const stepOrder = ['theme', 'source_material', 'rammer', 'dialog', 'confirm', 'final', 'export'];
    const currentIdx = stepOrder.indexOf(STEP_MAP[briefCurrentStep] || briefCurrentStep);
    const stepIdx = stepOrder.indexOf(stepKey);
    
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'current';
    return 'upcoming';
  };

  if (collapsed) {
    return (
      <div className="w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 space-y-4">
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
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
    <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">GS1</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">Dynamisk Brief</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          <PanelLeftClose className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isCurrentPage(item.page)
                ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
              "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isCurrentPage(item.page)
                ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* Kunnskapsbase Section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 mb-3">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Kunnskapsbase</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          I V1 er kunnskapsbasen den aktive <strong>briefmalen</strong> – strukturen og malen som brukes til å generere alle briefs.
        </p>

        {/* Brief Template Status */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-3">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Aktiv briefmal:</p>
          {briefTemplate ? (
            <div className="flex items-start space-x-2">
              {briefTemplate.extractionStatus === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              ) : briefTemplate.extractionStatus === 'pending' ? (
                <Loader2 className="h-4 w-4 text-yellow-600 animate-spin mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {briefTemplate.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {briefTemplate.extractionStatus === 'success' 
                    ? 'Klar til bruk' 
                    : briefTemplate.extractionStatus === 'pending' 
                    ? 'Behandles...' 
                    : 'Feil ved behandling'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-orange-600 dark:text-orange-400">
              Ingen briefmal lastet opp ennå.
            </p>
          )}
        </div>

        {isAdmin && (
          <Link to={createPageUrl('AdminBriefmal')}>
            <Button variant="outline" size="sm" className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Last opp briefmal
            </Button>
          </Link>
        )}
      </div>

      {/* Flow Explanation */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-1">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Slik fungerer flyten
        </h4>
        <div className="space-y-1">
          {FLOW_STEPS.map((step, idx) => {
            const status = getFlowStepStatus(step.key);
            return (
              <div 
                key={step.key} 
                className={cn(
                  "flex items-center space-x-2 py-1.5 px-2 rounded text-sm transition-colors",
                  status === 'current' && "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium",
                  status === 'completed' && "text-green-700 dark:text-green-400",
                  status === 'upcoming' && "text-gray-400 dark:text-gray-500"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0",
                  status === 'current' && "bg-blue-600 text-white",
                  status === 'completed' && "bg-green-600 text-white",
                  status === 'upcoming' && "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
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
    </div>
  );
}