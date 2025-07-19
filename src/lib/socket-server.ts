import { Server as NetServer } from 'http'
import { NextApiResponse } from 'next'
import { Server as SocketIOServer } from 'socket.io'

type NetServerWithIO = NetServer & {
  io?: SocketIOServer<any, any, any, any>
}

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServerWithIO
  }
}

interface RoomData {
  id: string
  participants: Set<string>
  host?: string
}

interface UserData {
  id: string
  name?: string
  email?: string
  room?: string
}

// Store active rooms and users
const rooms = new Map<string, RoomData>()
const users = new Map<string, UserData>()

export function initSocketServer(server: NetServerWithIO) {
  if (server.io) {
    console.log('Socket.io server already initialized')
    return server.io
  }

  const io = new SocketIOServer(server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXTAUTH_URL 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
    },
  })

  server.io = io

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`)

    // Handle user joining
    socket.on('user:join', ({ userId, name, email }) => {
      users.set(socket.id, { id: userId, name, email })
      console.log(`User joined: ${name} (${userId})`)
    })

    // Handle joining interview room
    socket.on('room:join', ({ roomId, userId, name }) => {
      // Leave previous room if any
      const userData = users.get(socket.id)
      if (userData?.room) {
        socket.leave(userData.room)
        const prevRoom = rooms.get(userData.room)
        if (prevRoom) {
          prevRoom.participants.delete(socket.id)
          socket.to(userData.room).emit('user:left', { userId: userData.id, name: userData.name })
          
          // Clean up empty rooms
          if (prevRoom.participants.size === 0) {
            rooms.delete(userData.room)
          }
        }
      }

      // Join new room
      socket.join(roomId)
      
      // Update user data
      if (userData) {
        userData.room = roomId
        users.set(socket.id, userData)
      }

      // Update room data
      let room = rooms.get(roomId)
      if (!room) {
        room = { id: roomId, participants: new Set(), host: socket.id }
        rooms.set(roomId, room)
      }
      room.participants.add(socket.id)

      // Notify others in room
      socket.to(roomId).emit('user:joined', { 
        userId, 
        name,
        socketId: socket.id 
      })

      // Send room state to joining user
      const participants = Array.from(room.participants)
        .map(socketId => {
          const user = users.get(socketId)
          return user ? { 
            socketId, 
            userId: user.id, 
            name: user.name,
            isHost: room?.host === socketId
          } : null
        })
        .filter(Boolean)

      socket.emit('room:joined', { 
        roomId, 
        participants,
        isHost: room.host === socket.id
      })

      console.log(`User ${name} joined room ${roomId}`)
    })

    // WebRTC Signaling Events
    socket.on('webrtc:offer', ({ to, offer }) => {
      console.log(`Relaying offer from ${socket.id} to ${to}`)
      socket.to(to).emit('webrtc:offer', { 
        from: socket.id, 
        offer 
      })
    })

    socket.on('webrtc:answer', ({ to, answer }) => {
      console.log(`Relaying answer from ${socket.id} to ${to}`)
      socket.to(to).emit('webrtc:answer', { 
        from: socket.id, 
        answer 
      })
    })

    socket.on('webrtc:ice-candidate', ({ to, candidate }) => {
      console.log(`Relaying ICE candidate from ${socket.id} to ${to}`)
      socket.to(to).emit('webrtc:ice-candidate', { 
        from: socket.id, 
        candidate 
      })
    })

    // Media state changes
    socket.on('media:toggle', ({ type, enabled, roomId }) => {
      const userData = users.get(socket.id)
      if (userData && roomId) {
        socket.to(roomId).emit('media:toggle', {
          userId: userData.id,
          socketId: socket.id,
          type,
          enabled
        })
      }
    })

    // Code editor collaboration
    socket.on('code:change', ({ roomId, code, language }) => {
      socket.to(roomId).emit('code:change', { 
        code, 
        language,
        userId: users.get(socket.id)?.id
      })
    })

    socket.on('code:cursor', ({ roomId, position, userId }) => {
      socket.to(roomId).emit('code:cursor', { 
        position, 
        userId,
        socketId: socket.id
      })
    })

    // Chat messages
    socket.on('chat:message', ({ roomId, message, userId, userName }) => {
      const timestamp = new Date().toISOString()
      const chatMessage = {
        id: `${Date.now()}-${socket.id}`,
        message,
        userId,
        userName,
        timestamp
      }

      // Broadcast to room (including sender for confirmation)
      io.to(roomId).emit('chat:message', chatMessage)
      console.log(`Chat message in room ${roomId}: ${userName}: ${message}`)
    })

    // Screen sharing
    socket.on('screen:start', ({ roomId }) => {
      const userData = users.get(socket.id)
      if (userData) {
        socket.to(roomId).emit('screen:start', { 
          userId: userData.id,
          socketId: socket.id,
          userName: userData.name
        })
      }
    })

    socket.on('screen:stop', ({ roomId }) => {
      const userData = users.get(socket.id)
      if (userData) {
        socket.to(roomId).emit('screen:stop', { 
          userId: userData.id,
          socketId: socket.id
        })
      }
    })

    // Session control events
    socket.on('session:start', ({ roomId }) => {
      const room = rooms.get(roomId)
      if (room && room.host === socket.id) {
        io.to(roomId).emit('session:started', { 
          startedBy: users.get(socket.id)?.name,
          timestamp: new Date().toISOString()
        })
      }
    })

    socket.on('session:end', ({ roomId }) => {
      const room = rooms.get(roomId)
      if (room && room.host === socket.id) {
        io.to(roomId).emit('session:ended', { 
          endedBy: users.get(socket.id)?.name,
          timestamp: new Date().toISOString()
        })
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`)
      
      const userData = users.get(socket.id)
      if (userData?.room) {
        const room = rooms.get(userData.room)
        if (room) {
          room.participants.delete(socket.id)
          
          // Notify others
          socket.to(userData.room).emit('user:left', { 
            userId: userData.id, 
            name: userData.name,
            socketId: socket.id
          })

          // Transfer host if needed
          if (room.host === socket.id && room.participants.size > 0) {
            const newHost = Array.from(room.participants)[0]
            room.host = newHost
            socket.to(userData.room).emit('host:changed', { 
              newHostSocketId: newHost,
              newHostUserId: users.get(newHost)?.id
            })
          }

          // Clean up empty rooms
          if (room.participants.size === 0) {
            rooms.delete(userData.room)
          }
        }
      }
      
      users.delete(socket.id)
    })
  })

  console.log('Socket.io server initialized')
  return io
}

export { rooms, users }
