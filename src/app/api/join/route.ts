import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    const { code, inviteToken } = body;

    if (!code && !inviteToken) {
      return NextResponse.json({ error: 'Join code or invite token is required' }, { status: 400 });
    }

    let interviewSession;

    if (inviteToken) {
      // Join by invitation token
      const invitation = await prisma.invitation.findUnique({
        where: { token: inviteToken },
        include: {
          session: {
            include: {
              host: { select: { name: true, email: true } },
              participant: { select: { name: true, email: true } },
            },
          },
        },
      });

      if (!invitation) {
        return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 });
      }

      if (invitation.status === 'declined') {
        return NextResponse.json({ error: 'Invitation has been declined' }, { status: 400 });
      }

      interviewSession = invitation.session;

      // Update invitation status to accepted
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted' },
      });

      // Set participant if not already set
      if (!interviewSession.participantId) {
        await prisma.interviewSession.update({
          where: { id: interviewSession.id },
          data: { participantId: user.id },
        });
      }
    } else {
      // Join by code (roomId or joinCode)
      interviewSession = await prisma.interviewSession.findFirst({
        where: {
          OR: [
            { roomId: code },
            { joinCode: code },
          ],
        },
        include: {
          host: { select: { name: true, email: true } },
          participant: { select: { name: true, email: true } },
        },
      });

      if (!interviewSession) {
        return NextResponse.json({ error: 'Session not found with this code' }, { status: 404 });
      }

      // Check permissions
      const isHost = interviewSession.hostId === user.id;
      const isInvitedParticipant = interviewSession.participantId === user.id;
      const canJoinPublicly = interviewSession.allowPublicJoin;

      if (!isHost && !isInvitedParticipant && !canJoinPublicly) {
        return NextResponse.json({ error: 'You are not authorized to join this session' }, { status: 403 });
      }

      // Set participant if joining and no participant set yet
      if (!isHost && !interviewSession.participantId) {
        await prisma.interviewSession.update({
          where: { id: interviewSession.id },
          data: { participantId: user.id },
        });
      }
    }

    return NextResponse.json({
      session: interviewSession,
      roomId: interviewSession.roomId,
      redirectUrl: `/interview/${interviewSession.roomId}`,
      message: 'Successfully joined session',
    });
  } catch (error) {
    console.error('Error joining session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
