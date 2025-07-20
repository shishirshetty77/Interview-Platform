const { createServer } = require('node:http')
const { parse } = require('node:url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handler = app.getRequestHandler()

const rooms = new Map() // Store room participants

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handler(req, res, parsedUrl)
  })

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  })

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    socket.on('join-room', ({ roomId, userName }) => {
      console.log(`${userName} (${socket.id}) joining room: ${roomId}`)
      
      socket.join(roomId)
      socket.roomId = roomId
      socket.userName = userName

      // Get current participants in room (excluding the user who just joined)
      const participants = []
      const room = io.sockets.adapter.rooms.get(roomId)
      if (room) {
        room.forEach(socketId => {
          const participantSocket = io.sockets.sockets.get(socketId)
          if (participantSocket && participantSocket.userName && socketId !== socket.id) {
            participants.push({
              id: socketId,
              name: participantSocket.userName
            })
          }
        })
      }

      // Send current participants to new user (excluding themselves)
      socket.emit('participants-list', participants)
      
      // Notify others in room about new user
      socket.to(roomId).emit('user-joined', {
        id: socket.id,
        name: userName
      })
      
      console.log(`Room ${roomId} now has ${room ? room.size : 0} total participants`)
      console.log(`Participants: ${participants.map(p => p.name).join(', ') || 'None'} + ${userName}`)
    })

    socket.on('webrtc-signal', ({ roomId, signal, to }) => {
      console.log(`WebRTC signal from ${socket.id} to ${to} in room ${roomId}:`, signal.type)
      socket.to(to).emit('webrtc-signal', {
        signal,
        from: socket.id
      })
    })

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)
      if (socket.roomId) {
        socket.to(socket.roomId).emit('user-left', {
          id: socket.id,
          name: socket.userName
        })
      }
    })
  })

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log('> Socket.io server ready for video calls')
    })
})
