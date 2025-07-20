'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Mic, MicOff, Video, VideoOff, Copy, Users } from 'lucide-react'
import { io, Socket } from 'socket.io-client'

export default function WebRTCTest() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(false)
  const [offer, setOffer] = useState('')
  const [answer, setAnswer] = useState('')
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [status, setStatus] = useState('Click Start to begin')
  const [role, setRole] = useState<'caller' | 'receiver' | null>(null)
  const [participantCount, setParticipantCount] = useState(0)
  const [roomCode, setRoomCode] = useState('')
  const [isInRoom, setIsInRoom] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const remoteSocketIdRef = useRef<string | null>(null)

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ]
  }

  useEffect(() => {
    initializeMedia()
    initializeSocket()
    return () => {
      cleanup()
    }
  }, [])

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      setLocalStream(stream)
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Initialize peer connection
      peerConnectionRef.current = new RTCPeerConnection(ICE_SERVERS)
      
      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current?.addTrack(track, stream)
      })
      
      // Handle remote stream
      peerConnectionRef.current.ontrack = (event) => {
        const [remoteStream] = event.streams
        setRemoteStream(remoteStream)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream
        }
      }
      
      // Handle connection state changes
      peerConnectionRef.current.onconnectionstatechange = () => {
        if (peerConnectionRef.current) {
          const state = peerConnectionRef.current.connectionState
          setIsConnected(state === 'connected')
          console.log('Connection state:', state)
        }
      }
      
    } catch (error) {
      console.error('Error accessing media devices:', error)
    }
  }

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioMuted(!audioTrack.enabled)
      }
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoMuted(!videoTrack.enabled)
      }
    }
  }

  const initializeSocket = () => {
    socketRef.current = io('http://localhost:3000', {
      path: '/api/socket',
      transports: ['websocket', 'polling']
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id)
      setStatus('Socket connected')
    })

    socket.on('room:joined', ({ roomId, participants }) => {
      console.log('Joined room:', roomId, 'Participants:', participants)
      setIsInRoom(true)
      setParticipantCount(participants.length)
      setStatus(`In room: ${roomId} (${participants.length} participants)`)
    })

    socket.on('user:joined', async ({ userId, socketId }) => {
      console.log('User joined:', userId, socketId)
      remoteSocketIdRef.current = socketId
      setParticipantCount(prev => prev + 1)
      // Create offer when someone joins
      await createOffer(socketId)
    })

    socket.on('webrtc:offer', async ({ from, offer }) => {
      console.log('Received offer from:', from)
      remoteSocketIdRef.current = from
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(offer)
        const answer = await peerConnectionRef.current.createAnswer()
        await peerConnectionRef.current.setLocalDescription(answer)
        socket.emit('webrtc:answer', { to: from, answer })
      }
    })

    socket.on('webrtc:answer', async ({ from, answer }) => {
      console.log('Received answer from:', from)
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(answer)
      }
    })

    socket.on('webrtc:ice-candidate', async ({ from, candidate }) => {
      console.log('Received ICE candidate from:', from)
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(candidate)
      }
    })

    socket.on('user:left', ({ userId, socketId }) => {
      console.log('User left:', userId)
      setParticipantCount(prev => prev - 1)
      setRemoteStream(null)
      setIsConnected(false)
    })

    socket.on('disconnect', () => {
      setStatus('Disconnected')
      setIsInRoom(false)
    })

    // Setup ICE candidate handling
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate && remoteSocketIdRef.current) {
          socket.emit('webrtc:ice-candidate', {
            to: remoteSocketIdRef.current,
            candidate: event.candidate
          })
        }
      }
    }
  }

  const createOffer = async (targetSocketId: string) => {
    try {
      if (peerConnectionRef.current && socketRef.current) {
        const offer = await peerConnectionRef.current.createOffer()
        await peerConnectionRef.current.setLocalDescription(offer)
        socketRef.current.emit('webrtc:offer', {
          to: targetSocketId,
          offer
        })
      }
    } catch (error) {
      console.error('Error creating offer:', error)
    }
  }

  const generateRoomCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    setRoomCode(code)
  }

  const createRoom = () => {
    if (!roomCode.trim()) {
      alert('Please generate or enter a room code first!')
      return
    }
    
    if (socketRef.current) {
      console.log('Creating/joining room:', roomCode)
      socketRef.current.emit('room:join', {
        roomId: roomCode,
        userId: `user-${Date.now()}`,
        name: 'Test User'
      })
    }
  }

  const joinRoom = () => {
    if (!roomCode.trim()) {
      alert('Please enter a room code!')
      return
    }
    
    if (socketRef.current) {
      console.log('Joining room:', roomCode)
      socketRef.current.emit('room:join', {
        roomId: roomCode,
        userId: `user-${Date.now()}`,
        name: 'Test User'
      })
    }
  }

  const leaveRoom = () => {
    if (socketRef.current && isInRoom) {
      socketRef.current.emit('room:leave', { roomId: roomCode })
      setIsInRoom(false)
      setParticipantCount(0)
      setRemoteStream(null)
      setIsConnected(false)
      setStatus('Left room')
    }
  }

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode)
      alert('Room code copied to clipboard!')
    }
  }

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
    if (socketRef.current) {
      socketRef.current.disconnect()
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">WebRTC Test</h1>
        
        {/* Status Bar */}
        <div className="mb-6 text-center">
          <div className="flex gap-4 justify-center items-center flex-wrap">
            <div className={`px-4 py-2 rounded ${isConnected ? 'bg-green-600' : 'bg-red-600'}`}>
              WebRTC: {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <div className="px-4 py-2 bg-blue-600 rounded flex items-center gap-2">
              <Users className="w-4 h-4" />
              {participantCount} participants
            </div>
            <div className="px-4 py-2 bg-gray-600 rounded text-sm">
              {status}
            </div>
          </div>
        </div>

        {/* Room Management */}
        <div className="mb-8 text-center space-y-4">
          <div className="flex gap-2 justify-center items-center flex-wrap">
            <input
              type="text"
              placeholder="Enter or generate room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              disabled={isInRoom}
            />
            <Button onClick={generateRoomCode} disabled={isInRoom}>Generate Code</Button>
            {roomCode && (
              <Button onClick={copyRoomCode} variant="outline" className="flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Copy
              </Button>
            )}
          </div>
          
          <div className="flex gap-2 justify-center flex-wrap">
            {!isInRoom ? (
              <>
                <Button onClick={createRoom} className="bg-blue-600 hover:bg-blue-700">
                  Create Room
                </Button>
                <Button onClick={joinRoom} className="bg-green-600 hover:bg-green-700">
                  Join Room
                </Button>
              </>
            ) : (
              <Button onClick={leaveRoom} variant="destructive">
                Leave Room
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Local Video */}
          <Card className="relative overflow-hidden bg-gray-800 border-gray-700">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-64 object-cover"
            />
            <div className="absolute bottom-4 left-4">
              <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">
                You (Local)
              </span>
            </div>
          </Card>

          {/* Remote Video */}
          <Card className="relative overflow-hidden bg-gray-800 border-gray-700">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-64 object-cover"
            />
            <div className="absolute bottom-4 left-4">
              <span className="bg-green-600 text-white px-2 py-1 rounded text-sm">
                Remote
              </span>
            </div>
            {!remoteStream && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                <p className="text-gray-400">Waiting for remote connection...</p>
              </div>
            )}
          </Card>
        </div>

        <div className="flex justify-center gap-4">
          <Button
            variant={isAudioMuted ? "destructive" : "outline"}
            onClick={toggleAudio}
            className="flex items-center gap-2"
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isAudioMuted ? 'Unmute' : 'Mute'}
          </Button>
          
          <Button
            variant={isVideoMuted ? "destructive" : "outline"}
            onClick={toggleVideo}
            className="flex items-center gap-2"
          >
            {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            {isVideoMuted ? 'Turn On Video' : 'Turn Off Video'}
          </Button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            This is a simple WebRTC test without authentication.
            <br />
            To test with another device, share the room code and visit: 
            <br />
            <strong>http://192.168.31.216:3001/test</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
