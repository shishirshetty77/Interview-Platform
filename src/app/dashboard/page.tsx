'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Video, Clock, Users, Code, LogIn, Mail, Lock, Trash2, Copy, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface InterviewSession {
  id: string;
  title: string;
  description?: string;
  status: string;
  roomId: string;
  joinCode?: string;
  host: {
    name: string;
    email: string;
  };
  participant?: {
    name: string;
    email: string;
  };
  createdAt: string;
  startedAt?: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    participantEmail: '',
    allowPublicJoin: false,
  });
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user) {
      fetchSessions();
    }
  }, [session, status, router]);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newSession = await response.json();
        setSessions([newSession, ...sessions]);
        setFormData({ title: '', description: '', participantEmail: '', allowPublicJoin: false });
        setShowCreateForm(false);
        
        // Send invitation if participant email provided
        if (formData.participantEmail) {
          try {
            await fetch('/api/invitations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sessionId: newSession.id,
                email: formData.participantEmail,
              }),
            });
            console.log('Invitation sent to:', formData.participantEmail);
          } catch (error) {
            console.error('Error sending invitation:', error);
          }
        }
        
        router.push(`/interview/${newSession.roomId}`);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const joinSession = (roomId: string) => {
    router.push(`/interview/${roomId}`);
  };

  const joinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    setJoinLoading(true);
    try {
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      
      if (response.ok) {
        const data = await response.json();
        router.push(data.redirectUrl);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to join session');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      alert('Failed to join session');
    } finally {
      setJoinLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this interview session? This action cannot be undone.')) {
      return;
    }

    setDeletingSessionId(sessionId);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove the session from the local state
        setSessions(sessions.filter(session => session.id !== sessionId));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session');
    } finally {
      setDeletingSessionId(null);
    }
  };

  const copyJoinCode = async (joinCode: string) => {
    try {
      await navigator.clipboard.writeText(joinCode);
      // You could add a toast notification here if you have one
      alert('Join code copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy join code:', error);
      alert('Failed to copy join code');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-4 w-4" />;
      case 'active':
        return <Video className="h-4 w-4" />;
      case 'completed':
        return <Code className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interview Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name || 'User'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowJoinForm(true)} variant="outline" className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Join Interview
          </Button>
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Interview
          </Button>
        </div>
      </div>

      {showJoinForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Join Interview Session</CardTitle>
            <CardDescription>
              Enter a join code or paste an interview link to join a session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={joinByCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinCode">Join Code or Link</Label>
                <Input
                  id="joinCode"
                  placeholder="Enter join code or paste interview link"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  You can enter either a 6-digit join code or paste the full interview link
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={joinLoading} className="flex items-center gap-2">
                  {joinLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  {joinLoading ? 'Joining...' : 'Join Interview'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowJoinForm(false);
                    setJoinCode('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showCreateForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Interview Session</CardTitle>
            <CardDescription>
              Set up a new interview room for conducting technical interviews.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createSession} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Interview Title</Label>
                <Input
                  id="title"
                  placeholder="Frontend Developer Interview"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="React, TypeScript, System Design discussion..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="participantEmail">Participant Email (Optional)</Label>
                <Input
                  id="participantEmail"
                  type="email"
                  placeholder="participant@example.com"
                  value={formData.participantEmail}
                  onChange={(e) => setFormData({ ...formData, participantEmail: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  An invitation will be sent to this email automatically
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowPublicJoin"
                  checked={formData.allowPublicJoin}
                  onChange={(e) => setFormData({ ...formData, allowPublicJoin: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="allowPublicJoin" className="text-sm">
                  Allow anyone with the link or code to join
                </Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create & Join</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((interview) => (
          <Card key={interview.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{interview.title}</CardTitle>
                  <CardDescription className="text-sm">
                    Host: {interview.host.name}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusColor(interview.status)} flex items-center gap-1`}>
                    {getStatusIcon(interview.status)}
                    {interview.status}
                  </Badge>
                  {/* Only show delete button if user is the host */}
                  {interview.host.email === session?.user?.email && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteSession(interview.id)}
                      disabled={deletingSessionId === interview.id}
                    >
                      {deletingSessionId === interview.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {interview.description && (
                <p className="text-sm text-muted-foreground">{interview.description}</p>
              )}
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  {interview.participant 
                    ? `${interview.participant.name} joined`
                    : 'Waiting for participant'
                  }
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(interview.createdAt).toLocaleDateString()}
                  {interview.startedAt && (
                    <> • Started: {new Date(interview.startedAt).toLocaleDateString()}</>
                  )}
                </div>
                
                {interview.joinCode && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono text-black">{interview.joinCode}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => copyJoinCode(interview.joinCode!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <Button 
                onClick={() => joinSession(interview.roomId)}
                className="w-full"
                variant={interview.status === 'active' ? 'default' : 'outline'}
              >
                {interview.status === 'active' ? 'Rejoin Interview' : 'Join Interview'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {sessions.length === 0 && !loading && (
        <div className="text-center py-12">
          <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No interview sessions yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first interview session to get started.
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            Create Interview Session
          </Button>
        </div>
      )}
    </div>
  );
}
