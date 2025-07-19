'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const getErrorMessage = (error: string | null) => {
  switch (error) {
    case 'Configuration':
      return 'There is a problem with the server configuration.';
    case 'AccessDenied':
      return 'You do not have permission to sign in.';
    case 'Verification':
      return 'The verification token has expired or has already been used.';
    case 'OAuthSignin':
      return 'Error in constructing an authorization URL.';
    case 'OAuthCallback':
      return 'Error in handling the response from an OAuth provider.';
    case 'OAuthCreateAccount':
      return 'Could not create OAuth provider user in the database.';
    case 'EmailCreateAccount':
      return 'Could not create email provider user in the database.';
    case 'Callback':
      return 'Error in the OAuth callback handler route.';
    case 'OAuthAccountNotLinked':
      return 'Another account with the same e-mail address exists but with a different sign-in method.';
    case 'EmailSignin':
      return 'Sending the e-mail with the verification token failed.';
    case 'CredentialsSignin':
      return 'The credentials you provided were incorrect.';
    case 'SessionRequired':
      return 'You must be signed in to access this page.';
    default:
      return 'An unexpected authentication error occurred.';
  }
};

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error') || null;
  const errorMessage = getErrorMessage(error);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 text-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-600 rounded-full">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-red-400">Authentication Error</CardTitle>
          <CardDescription className="text-gray-300">
            {errorMessage}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
            <h3 className="font-medium text-red-300 mb-2">What you can do:</h3>
            <ul className="text-sm text-red-200 space-y-1 list-disc list-inside">
              <li>Try signing in again</li>
              <li>Clear your browser cookies and cache</li>
              <li>Contact support if the problem persists</li>
            </ul>
          </div>
          
          <div className="flex flex-col gap-2">
            <Link href="/auth/signin">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </Link>
            
            <Link href="/">
              <Button variant="outline" className="w-full border-white/20 hover:bg-white/10 flex items-center gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </Link>
          </div>
          
          {error && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Error code: {error}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
