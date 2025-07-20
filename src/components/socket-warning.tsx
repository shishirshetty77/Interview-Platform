'use client';

import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function SocketWarning() {
  // Check if we're in a serverless environment (like Vercel)
  const isServerless = typeof window !== 'undefined' && 
    (window.location.hostname.includes('vercel.app') || 
     window.location.hostname.includes('netlify.app'));

  if (!isServerless) return null;

  return (
    <Card className="mx-4 my-4 bg-yellow-50 border-yellow-200">
      <div className="p-4 flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div>
          <h3 className="text-sm font-medium text-yellow-800">
            Demo Mode - Video Calling Disabled
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            This app is running on a serverless platform that doesn&apos;t support WebSocket connections. 
            The video calling features are disabled. For full functionality, deploy to a platform 
            that supports WebSockets (like Railway, Render, or your own server).
          </p>
        </div>
      </div>
    </Card>
  );
}
