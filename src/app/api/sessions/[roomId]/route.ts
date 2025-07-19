import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
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

    const interviewSession = await prisma.interviewSession.findUnique({
      where: { roomId },
      include: {
        host: {
          select: { id: true, name: true, email: true },
        },
        participant: {
          select: { id: true, name: true, email: true },
        },
        chatMessages: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!interviewSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user is authorized to access this session
    if (
      interviewSession.hostId !== user.id &&
      interviewSession.participantId !== user.id
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(interviewSession);
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
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
    const { status, code, participantEmail } = body;

    const interviewSession = await prisma.interviewSession.findUnique({
      where: { roomId },
    });

    if (!interviewSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user is authorized to modify this session
    if (
      interviewSession.hostId !== user.id &&
      interviewSession.participantId !== user.id
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updateData: any = {};

    if (status) {
      updateData.status = status;
      if (status === 'active') {
        updateData.startedAt = new Date();
      } else if (status === 'completed') {
        updateData.endedAt = new Date();
      }
    }

    if (code !== undefined) {
      updateData.code = code;
    }

    // Handle participant joining
    if (participantEmail && !interviewSession.participantId) {
      const participant = await prisma.user.findUnique({
        where: { email: participantEmail },
      });
      
      if (participant) {
        updateData.participantId = participant.id;
      }
    }

    const updatedSession = await prisma.interviewSession.update({
      where: { roomId },
      data: updateData,
      include: {
        host: {
          select: { id: true, name: true, email: true },
        },
        participant: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
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

    const interviewSession = await prisma.interviewSession.findUnique({
      where: { roomId },
    });

    if (!interviewSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Only the host can delete the session
    if (interviewSession.hostId !== user.id) {
      return NextResponse.json({ error: 'Only the host can delete the session' }, { status: 403 });
    }

    await prisma.interviewSession.delete({
      where: { roomId },
    });

    return NextResponse.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
