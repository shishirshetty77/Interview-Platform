import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { sessionId, email } = body;

    if (!sessionId || !email) {
      return NextResponse.json({ error: 'Session ID and email are required' }, { status: 400 });
    }

    // Verify user owns this session
    const interviewSession = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
    });

    if (!interviewSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (interviewSession.hostId !== user.id) {
      return NextResponse.json({ error: 'Only session host can send invitations' }, { status: 403 });
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findUnique({
      where: {
        email_sessionId: {
          email: email,
          sessionId: sessionId,
        },
      },
    });

    if (existingInvitation) {
      return NextResponse.json({ error: 'Invitation already sent to this email' }, { status: 400 });
    }

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        email: email,
        sessionId: sessionId,
        token: nanoid(32),
      },
      include: {
        session: {
          select: {
            title: true,
            roomId: true,
            joinCode: true,
          },
        },
      },
    });

    // Here you would typically send an email
    // For now, we'll just return the invitation details
    // TODO: Integrate with email service (SendGrid, Nodemailer, etc.)
    
    const inviteLink = `${process.env.NEXTAUTH_URL}/interview/${interviewSession.roomId}?invite=${invitation.token}`;
    
    // Mock email content
    const emailContent = {
      to: email,
      subject: `Interview Invitation: ${interviewSession.title}`,
      content: `You've been invited to join an interview session.
      
Interview: ${interviewSession.title}
Join Link: ${inviteLink}
Join Code: ${interviewSession.joinCode}

Click the link above or use the join code to participate in the interview.`,
    };

    console.log('Email would be sent:', emailContent);

    return NextResponse.json({
      invitation,
      inviteLink,
      emailContent,
      message: 'Invitation created successfully',
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Get invitations for the session
    const invitations = await prisma.invitation.findMany({
      where: { sessionId },
      include: {
        session: {
          select: {
            title: true,
            hostId: true,
          },
        },
      },
    });

    // Check if user has permission to view invitations
    if (invitations.length > 0 && invitations[0].session.hostId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
