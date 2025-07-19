import type { NextApiRequest } from 'next'
import { initSocketServer, type NextApiResponseServerIO } from '@/lib/socket-server'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIO,
) {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io server...')
    initSocketServer(res.socket.server)
  } else {
    console.log('Socket.io server already running')
  }
  
  res.end()
}
