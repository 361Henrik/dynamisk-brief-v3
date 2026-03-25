import React, { useState } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  User,
  Mail,
  Shield,
  MessageSquare,
  Info,
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function SettingsContent() {
  const { user } = useAuth();
  const [briefmalOpen, setBriefmalOpen] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#454545]">Innstillinger</h1>
        <p className="text-[#888B8D] mt-1">
          Din profil og kontoinformasjon
        </p>
      </div>

      {/* User Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Min profil
          </CardTitle>
          <CardDescription>Din kontoinformasjon</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-[#002C6C]/10 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-[#002C6C]">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-[#454545]">
                {user?.full_name || 'Bruker'}
              </h3>
              <div className="flex items-center gap-2 text-sm text-[#888B8D]">
                <Mail className="h-4 w-4" />
                {user?.email}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="h-4 w-4 text-gray-400" />
                <Badge variant="outline" className="capitalize">
                  {user?.role || 'bruker'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Admin */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Kontakt admin
          </CardTitle>
          <CardDescription>
            Trenger du hjelp eller har spørsmål?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#454545]">
            Kontakt din administrator for å:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[#454545]">
            <li>• Endre din rolle eller tilgang</li>
            <li>• Få hjelp med briefmaler</li>
            <li>• Rapportere problemer</li>
            <li>• Foreslå forbedringer</li>
          </ul>
          <p className="mt-4 text-sm text-[#888B8D]">
            Send en e-post til din administrator eller kontakt GS1 Norway direkte.
          </p>
        </CardContent>
      </Card>

      {/* Om Dynamisk Brief */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Om Dynamisk Brief
          </CardTitle>
          <CardDescription>
            Hvordan løsningen fungerer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#454545] leading-relaxed">
            Dynamisk Brief bruker intelligent teknologi for å gjøre briefprosessen enklere, raskere og mer treffsikker. Løsningen benytter ulike språkmodeller og velger den som passer best til oppgaven, basert på kvalitet, relevans og effektiv bruk av ressurser. Det betyr at den ikke alltid bruker den nyeste eller mest omfattende modellen, dersom det ikke er nødvendig for å gi et godt resultat. Du vurderer og godkjenner alltid innholdet selv.
          </p>
        </CardContent>
      </Card>

      {/* Briefmal */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setBriefmalOpen(o => !o)}
        >
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Briefmal
            <span className="ml-auto">
              {briefmalOpen ? <ChevronUp className="h-4 w-4 text-[#888B8D]" /> : <ChevronDown className="h-4 w-4 text-[#888B8D]" />}
            </span>
          </CardTitle>
          <CardDescription>Strukturen bak intervjuet og den ferdige briefen</CardDescription>
        </CardHeader>
        {briefmalOpen && (
          <CardContent className="space-y-3">
            <p className="text-sm text-[#454545] leading-relaxed">
              Briefmalen definerer hvilke hovedpunkter som skal fylles ut i intervjuet og strukturen på den ferdige briefen. Den lastes opp av administrator som en PDF og brukes av systemet for å styre både intervjuet og den genererte briefen.
            </p>
            <div>
              <p className="text-xs font-semibold text-[#454545] uppercase tracking-wider mb-2">Hovedkategorier i briefen:</p>
              <ul className="text-sm text-[#888B8D] space-y-1">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#888B8D] rounded-full flex-shrink-0" />Prosjektinformasjon</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#888B8D] rounded-full flex-shrink-0" />Bakgrunn og situasjonsbeskrivelse</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#888B8D] rounded-full flex-shrink-0" />Mål og suksesskriterier</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#888B8D] rounded-full flex-shrink-0" />Målgrupper</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#888B8D] rounded-full flex-shrink-0" />GS1-tilbudet og verdiforslag</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#888B8D] rounded-full flex-shrink-0" />Budskap, tone og stil</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#888B8D] rounded-full flex-shrink-0" />Leveranser og kanaler</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#888B8D] rounded-full flex-shrink-0" />Praktiske rammer og godkjenning</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Version Info */}
      <Card>
        <CardContent className="py-4">
          <p className="text-xs text-center text-[#888B8D]">
            Dynamisk Brief v1.2.0
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Settings() {
  return (
    <RequireAuth>
      <SettingsContent />
    </RequireAuth>
  );
}