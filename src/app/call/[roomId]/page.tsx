'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Users } from 'lucide-react'
import { io, Socket } from 'socket.io-client'

interface Participant {
  id: string
  name: string
}

export default function VideoCall() {
  const params = useParams()
  const roomId = params?.roomId as string
  
  const [socket, setSocket] = useState<Socket | null>(null)
  const [userName, setUserName] = useState('')
  const [isJoined, setIsJoined] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('Disconnected')
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  
  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ],
  }

  // Initialize socket connection
  useEffect(() => {
    const socketInstance = io('http://localhost:3000')
    setSocket(socketInstance)
    
    socketInstance.on('connect', () => {
      console.log('Connected to server:', socketInstance.id)
      setConnectionStatus('Connected')
    })
    
    socketInstance.on('disconnect', () => {
      setConnectionStatus('Disconnected')
    })
    
    socketInstance.on('participants-list', (participantsList: Participant[]) => {
      console.log('Participants list received:', participantsList)
      // Filter out self from participants list
      const otherParticipants = participantsList.filter(p => p.id !== socketInstance.id)
      setParticipants(otherParticipants)
    })
    
    socketInstance.on('user-joined', async ({ id, name }: { id: string, name: string }) => {
      console.log(`${name} joined (${id})`)
      // Only add if it's not ourselves
      if (id !== socketInstance.id) {
        setParticipants(prev => {
          const filtered = prev.filter(p => p.id !== id)
          return [...filtered, { id, name }]
        })
        
        // Create peer connection for new user if we have local stream
        // We need to wait for the local stream to be set properly
        setTimeout(async () => {
          if (localStreamRef.current) {
            console.log('Creating peer connection for new user:', id)
            await createPeerConnection(id, true, localStreamRef.current)
          } else {
            console.log('No local stream yet for peer connection')
          }
        }, 1000)
      }
    })
    
    socketInstance.on('user-left', ({ id, name }: { id: string, name: string }) => {
      console.log(`${name} left (${id})`)
      setParticipants(prev => prev.filter(p => p.id !== id))
      
      // Clean up peer connection
      const pc = peerConnections.current.get(id)
      if (pc) {
        pc.close()
        peerConnections.current.delete(id)
      }
      
      // Remove remote stream
      setRemoteStreams(prev => {
        const newStreams = new Map(prev)
        newStreams.delete(id)
        return newStreams
      })
    })
    
    socketInstance.on('webrtc-signal', async ({ signal, from }) => {
      console.log('Received WebRTC signal from:', from, signal.type)
      await handleWebRTCSignal(from, signal)
    })
    
    return () => {
      socketInstance.disconnect()
    }
  }, [])
  
  // Effect to create peer connections for existing participants when localStream becomes available
  useEffect(() => {
    if (localStream && participants.length > 0) {
      console.log('Local stream available, creating peer connections for existing participants:', participants)
      participants.forEach(async (participant) => {
        if (!peerConnections.current.has(participant.id)) {
          console.log('Creating peer connection for existing participant:', participant.id)
          await createPeerConnection(participant.id, true, localStream)
        }
      })
    }
  }, [localStream, participants])
  
  // Create peer connection
  const createPeerConnection = async (peerId: string, isInitiator: boolean, stream?: MediaStream) => {
    console.log(`Creating peer connection with ${peerId}, initiator: ${isInitiator}`)
    
    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnections.current.set(peerId, pc)
    
    // Add local stream to peer connection
    const streamToUse = stream || localStream
    if (streamToUse) {
      console.log('Adding tracks to peer connection:', streamToUse.getTracks().length)
      streamToUse.getTracks().forEach(track => {
        console.log('Adding track:', track.kind, track.enabled)
        pc.addTrack(track, streamToUse)
      })
    } else {
      console.warn('No local stream available for peer connection')
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track from:', peerId)
      const [stream] = event.streams
      console.log('Remote stream:', stream, 'tracks:', stream.getTracks().length)
      
      setRemoteStreams(prev => {
        const newStreams = new Map(prev)
        newStreams.set(peerId, stream)
        
        // Set video element for first remote stream
        setTimeout(() => {
          if (remoteVideoRef.current && newStreams.size > 0) {
            const firstStream = newStreams.values().next().value
            if (firstStream) {
              remoteVideoRef.current.srcObject = firstStream
              console.log('Set remote video srcObject:', firstStream)
              
              remoteVideoRef.current.play().catch(e => {
                console.error('Error playing remote video:', e)
              })
            }
          }
        }, 100)
        
        return newStreams
      })
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-signal', {
          roomId,
          to: peerId,
          signal: { type: 'ice-candidate', candidate: event.candidate }
        })
      }
    }
    
    // Create offer if initiator
    if (isInitiator) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      
      socket?.emit('webrtc-signal', {
        roomId,
        to: peerId,
        signal: { type: 'offer', offer }
      })
    }
  }
  
  // Handle WebRTC signaling
  const handleWebRTCSignal = async (from: string, signal: any) => {
    console.log('Handling WebRTC signal from:', from, 'type:', signal.type)
    let pc = peerConnections.current.get(from)
    
    if (!pc) {
      console.log('Creating peer connection for signal from:', from)
      // Create peer connection if it doesn't exist (never initiate)
      await createPeerConnection(from, false, localStreamRef.current || undefined)
      pc = peerConnections.current.get(from)
    }
    
    if (!pc) {
      console.error('Failed to create peer connection for:', from)
      return
    }
    
    try {
      if (signal.type === 'offer') {
        console.log('Processing offer from:', from)
        // Handle offer collision - be polite
        const offerCollision = pc.signalingState !== 'stable' && pc.localDescription
        
        if (offerCollision) {
          console.log('Offer collision detected, being polite')
          // Rollback our local offer
          await pc.setLocalDescription(new RTCSessionDescription({ type: 'rollback' }))
        }
        
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        
        console.log('Sending answer to:', from)
        socket?.emit('webrtc-signal', {
          roomId,
          to: from,
          signal: { type: 'answer', answer }
        })
      } else if (signal.type === 'answer') {
        console.log('Processing answer from:', from)
        await pc.setRemoteDescription(new RTCSessionDescription(signal.answer))
      } else if (signal.type === 'ice-candidate') {
        console.log('Processing ICE candidate from:', from)
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
      }
    } catch (error) {
      console.error('Error handling WebRTC signal from:', from, error)
    }
  }
  
  // Join room
  const joinRoom = async () => {
    if (!userName.trim() || !socket) return
    
    try {
      console.log('Requesting camera and microphone access...')
      
      // Get user media with better error handling
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      })
      
      console.log('Got media stream:', stream)
      console.log('Video tracks:', stream.getVideoTracks().length)
      console.log('Audio tracks:', stream.getAudioTracks().length)
      
      // Verify video track is active
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        console.log('Video track state:', {
          enabled: videoTrack.enabled,
          muted: videoTrack.muted,
          readyState: videoTrack.readyState,
          label: videoTrack.label
        })
      }
      
      setLocalStream(stream)
      localStreamRef.current = stream
      
      // Wait for component to re-render, then set video
      setTimeout(() => {
        if (localVideoRef.current) {
          console.log('Setting video srcObject to:', stream)
          localVideoRef.current.srcObject = stream
          
          // Add event listeners for debugging
          localVideoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded, dimensions:', {
              videoWidth: localVideoRef.current?.videoWidth,
              videoHeight: localVideoRef.current?.videoHeight
            })
          }
          
          localVideoRef.current.onplay = () => console.log('Video started playing')
          localVideoRef.current.onerror = (e) => console.error('Video error:', e)
          
          // Force play
          localVideoRef.current.play().then(() => {
            console.log('Video play() succeeded')
          }).catch(e => {
            console.error('Error playing video:', e)
          })
        } else {
          console.error('Local video ref is still null after timeout')
        }
      }, 100)
      
      // Join room via socket
      socket.emit('join-room', { roomId, userName })
      setIsJoined(true)
      
    } catch (error) {
      console.error('Error joining room:', error)
      
      let errorMessage = 'Error accessing camera/microphone: '
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Permission denied. Please allow camera and microphone access.'
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera or microphone found.'
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Camera/microphone not supported in this browser.'
      } else {
        errorMessage += error.message
      }
      
      alert(errorMessage)
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
  
  const leaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    
    peerConnections.current.forEach(pc => pc.close())
    peerConnections.current.clear()
    
    socket?.disconnect()
    setIsJoined(false)
    setLocalStream(null)
    setRemoteStreams(new Map())
  }
  
  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('Room link copied! Share with others to join the call.')
  }
  
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 bg-gray-800 border-gray-700">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Join Video Call</h1>
            <p className="text-gray-400">Room: {roomId}</p>
            <p className="text-sm text-gray-500 mt-2">Status: {connectionStatus}</p>
          </div>
          
          <div className="space-y-4">
            <Input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              className="bg-gray-700 border-gray-600 text-white"
              onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
            />
            
            <Button 
              onClick={joinRoom} 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!userName.trim() || connectionStatus === 'Disconnected'}
            >
              Join Call
            </Button>
            
            <Button 
              onClick={copyRoomLink}
              variant="outline"
              className="w-full border-gray-600 text-gray-300"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Room Link
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Video Call - Room: {roomId}</h1>
            <p className="text-gray-400">Welcome, {userName}!</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{participants.length + 1} participant{participants.length !== 0 ? 's' : ''}</span>
            </div>
            <div className={`px-3 py-1 rounded text-sm ${
              connectionStatus === 'Connected' ? 'bg-green-600' : 'bg-red-600'
            }`}>
              {connectionStatus}
            </div>
          </div>
        </div>
        
        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Local Video */}
          <Card className="relative overflow-hidden bg-gray-800 border-gray-700 aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              onLoadedData={() => console.log('Video loaded data')}
              onCanPlay={() => console.log('Video can play')}
              onPlay={() => console.log('Video started playing')}
              onError={(e) => console.error('Video error:', e)}
            />
            {!localStream && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                <div className="text-center">
                  <Video className="w-16 h-16 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">No video stream</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-blue-600 px-2 py-1 rounded text-sm">
              You ({userName})
            </div>
            <div className="absolute top-4 right-4 flex gap-2">
              {isAudioMuted && <MicOff className="w-5 h-5 text-red-400" />}
              {isVideoMuted && <VideoOff className="w-5 h-5 text-red-400" />}
            </div>
          </Card>

          {/* Remote Video */}
          <Card className="relative overflow-hidden bg-gray-800 border-gray-700 aspect-video">
            {remoteStreams.size > 0 ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Waiting for others to join...</p>
                  <Button onClick={copyRoomLink} variant="outline" className="mt-4">
                    <Copy className="w-4 h-4 mr-2" />
                    Share Room Link
                  </Button>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-green-600 px-2 py-1 rounded text-sm">
              Remote Participant
            </div>
          </Card>
        </div>
        
        {/* Controls */}
        <div className="flex justify-center gap-4 mb-6">
          <Button
            variant={isAudioMuted ? "destructive" : "outline"}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full w-12 h-12 p-0"
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            variant={isVideoMuted ? "destructive" : "outline"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full w-12 h-12 p-0"
          >
            {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={leaveCall}
            className="rounded-full w-12 h-12 p-0"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Debug Info */}
        <Card className="bg-gray-800 border-gray-700 p-4">
          <h3 className="text-lg font-semibold mb-2">Debug Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <p>Local Stream: {localStream ? '✅ Active' : '❌ None'}</p>
              <p>Video Tracks: {localStream ? localStream.getVideoTracks().length : 0}</p>
              <p>Audio Tracks: {localStream ? localStream.getAudioTracks().length : 0}</p>
              <p>Remote Streams: {remoteStreams.size}</p>
              <p>Peer Connections: {peerConnections.current.size}</p>
            </div>
            <div>
              <p>Participants: {participants.map(p => p.name).join(', ') || 'None'}</p>
              <p>Socket Status: {connectionStatus}</p>
              <p>Room ID: {roomId}</p>
              <p>Video Element: {localVideoRef.current ? '✅ Ready' : '❌ Not Ready'}</p>
              <p>Camera Permissions: {navigator.permissions ? 'Checking...' : 'Not supported'}</p>
            </div>
          </div>
          
          {/* Test Button */}
          <div className="mt-4">
            <Button 
              onClick={() => {
                console.log('Video element:', localVideoRef.current)
                console.log('Stream object:', localStream)
                if (localVideoRef.current) {
                  console.log('Video srcObject:', localVideoRef.current.srcObject)
                  console.log('Video readyState:', localVideoRef.current.readyState)
                  console.log('Video paused:', localVideoRef.current.paused)
                }
              }}
              variant="outline"
              size="sm"
            >
              Debug Video Element
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
