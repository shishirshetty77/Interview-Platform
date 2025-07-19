import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
};

export const connectSocket = () => {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Socket event types
export interface SocketEvents {
  'join-room': (roomId: string, userId: string) => void;
  'leave-room': (roomId: string, userId: string) => void;
  'code-change': (data: { roomId: string; code: string; language: string }) => void;
  'cursor-change': (data: { roomId: string; position: any; userId: string }) => void;
  'webrtc-offer': (data: { roomId: string; offer: RTCSessionDescriptionInit; from: string; to: string }) => void;
  'webrtc-answer': (data: { roomId: string; answer: RTCSessionDescriptionInit; from: string; to: string }) => void;
  'webrtc-ice-candidate': (data: { roomId: string; candidate: RTCIceCandidate; from: string; to: string }) => void;
  'user-joined': (data: { roomId: string; userId: string; user: any }) => void;
  'user-left': (data: { roomId: string; userId: string }) => void;
  'chat-message': (data: { roomId: string; message: string; userId: string; timestamp: number }) => void;
}
