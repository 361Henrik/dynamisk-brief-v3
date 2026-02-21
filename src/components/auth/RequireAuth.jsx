import React from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from './AuthProvider';
import { Loader2, ShieldX, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function RequireAuth({ children, requireAdmin = false }) {
  const { user, loading, isAdmin, isActive } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#002C6C] mx-auto mb-4" />
          <p className="text-gray-600">Laster...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    base44.auth.redirectToLogin();
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#002C6C] mx-auto mb-4" />
          <p className="text-gray-600">Omdirigerer til innlogging...</p>
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <UserX className="h-12 w-12 text-orange-500 mx-auto mb-2" />
            <CardTitle>Konto deaktivert</CardTitle>
            <CardDescription>
              Din konto er for øyeblikket deaktivert. Kontakt en administrator for å få tilgang.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => base44.auth.logout('/')}>
              Logg ut
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <ShieldX className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <CardTitle>Ingen tilgang</CardTitle>
            <CardDescription>
              Du har ikke tilgang til denne siden. Denne funksjonen krever administratorrettigheter.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => window.history.back()}>
              Gå tilbake
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}