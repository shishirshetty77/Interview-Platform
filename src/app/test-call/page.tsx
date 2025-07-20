'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react'

export default function TestCall() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(false)
  const [isCallStarted, setIsCallStarted] = useState(false)
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ],
  }

  // Check camera permissions
  const checkPermissions = async () => {
    try {
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName })
      console.log('Camera permission:', permissions.state)
      
      const micPermissions = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      console.log('Microphone permission:', micPermissions.state)
    } catch (error) {
      console.log('Cannot check permissions:', error)
    }
  }

  // Check available devices
  const checkDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      console.log('Available devices:')
      devices.forEach(device => {
        console.log(`${device.kind}: ${device.label || 'Unknown device'}`)
      })
    } catch (error) {
      console.error('Error getting devices:', error)
    }
  }

  // Initialize media
  const startCall = async () => {
    try {
      console.log('Starting call...')
      
      // Check permissions and devices first
      await checkPermissions()
      await checkDevices()
      
      // Get user media
      console.log('Requesting user media...')
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
      
      // Log track details
      stream.getVideoTracks().forEach((track, index) => {
        console.log(`Video track ${index}:`, {
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: track.getSettings()
        })
      })
      
      setLocalStream(stream)
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        console.log('Set video srcObject')
        
        // Force play and log events
        localVideoRef.current.onloadedmetadata = () => console.log('Video metadata loaded')
        localVideoRef.current.onloadeddata = () => console.log('Video data loaded')
        localVideoRef.current.oncanplay = () => console.log('Video can play')
        localVideoRef.current.onplay = () => console.log('Video playing')
        localVideoRef.current.onerror = (e) => console.error('Video error:', e)
        
        try {
          await localVideoRef.current.play()
          console.log('Video play() succeeded')
        } catch (playError) {
          console.error('Video play() failed:', playError)
        }
      } else {
        console.error('Video ref is null!')
      }
      
      // Create peer connection
      peerConnectionRef.current = new RTCPeerConnection(ICE_SERVERS)
      
      // Add stream tracks
      stream.getTracks().forEach(track => {
        peerConnectionRef.current?.addTrack(track, stream)
      })
      
      // Handle remote stream
      peerConnectionRef.current.ontrack = (event) => {
        console.log('Received remote track:', event)
        const [stream] = event.streams
        setRemoteStream(stream)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
        }
      }
      
      // Log ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('ICE candidate:', event.candidate)
        }
      }
      
      // Log connection state changes
      peerConnectionRef.current.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnectionRef.current?.connectionState)
      }
      
      setIsCallStarted(true)
      
    } catch (error) {
      console.error('Error starting call:', error)
      
      let errorMessage = 'Error accessing camera/microphone: '
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Permission denied. Please allow camera and microphone access and reload the page.'
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera or microphone found on this device.'
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

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
    
    setLocalStream(null)
    setRemoteStream(null)
    setIsCallStarted(false)
    setIsAudioMuted(false)
    setIsVideoMuted(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Video Call Test</h1>
        
        {!isCallStarted ? (
          <div className="text-center">
            <Button onClick={startCall} size="lg" className="bg-green-600 hover:bg-green-700">
              Start Video Call Test
            </Button>
            <p className="mt-4 text-gray-400">
              This will request access to your camera and microphone
            </p>
          </div>
        ) : (
          <>
            {/* Video Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Local Video */}
              <Card className="relative overflow-hidden bg-gray-800 border-gray-700 aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 bg-blue-600 px-2 py-1 rounded text-sm">
                  You (Local)
                </div>
                <div className="absolute top-4 right-4 flex gap-2">
                  {isAudioMuted && <MicOff className="w-5 h-5 text-red-400" />}
                  {isVideoMuted && <VideoOff className="w-5 h-5 text-red-400" />}
                </div>
              </Card>

              {/* Remote Video Placeholder */}
              <Card className="relative overflow-hidden bg-gray-800 border-gray-700 aspect-video">
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Video className="w-8 h-8 text-gray-500" />
                      </div>
                      <p className="text-gray-400">Waiting for remote participant...</p>
                      <p className="text-sm text-gray-500 mt-2">
                        (This is just a test - no actual remote connection yet)
                      </p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-green-600 px-2 py-1 rounded text-sm">
                  Remote
                </div>
              </Card>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4">
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
                onClick={endCall}
                className="rounded-full w-12 h-12 p-0"
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </div>

            {/* Debug Info */}
            <div className="mt-8 bg-gray-800 p-4 rounded">
              <h3 className="text-lg font-semibold mb-2">Debug Info</h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p>Local Stream: {localStream ? '✅ Active' : '❌ None'}</p>
                <p>Remote Stream: {remoteStream ? '✅ Active' : '❌ None'}</p>
                <p>Audio Muted: {isAudioMuted ? '🔇 Yes' : '🔊 No'}</p>
                <p>Video Muted: {isVideoMuted ? '📹 Yes' : '📷 No'}</p>
                <p>Peer Connection: {peerConnectionRef.current ? '✅ Created' : '❌ None'}</p>
                <p>Connection State: {peerConnectionRef.current?.connectionState || 'N/A'}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
