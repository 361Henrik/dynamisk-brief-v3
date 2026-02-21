import React from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  User, 
  Mail, 
  Shield,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function SettingsContent() {
  const { user } = useAuth();

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

      {/* Version Info */}
      <Card>
        <CardContent className="py-4">
          <p className="text-xs text-center text-[#888B8D]">
            Dynamisk Brief V1.1
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