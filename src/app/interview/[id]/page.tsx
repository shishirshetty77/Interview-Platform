'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, 
  MessageSquare, Settings, PhoneOff, Users, Clock,
  Send, Maximize2, Minimize2, Copy, Check
} from 'lucide-react'
import { useSocket } from '@/lib/socket-client'
import { useWebRTC } from '@/lib/webrtc'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-900 rounded-lg">
        <div className="text-white">Loading code editor...</div>
      </div>
    )
  }
)

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: string
}

interface ParticipantData {
  id: string
  name: string
  isAudioMuted: boolean
  isVideoMuted: boolean
  isScreenSharing: boolean
}

export default function InterviewRoom() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const sessionId = params?.id as string

  // Socket and WebRTC hooks
  const { socket, isConnected } = useSocket()
  const {
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    cleanup
  } = useWebRTC()

  // Component state
  const [participants, setParticipants] = useState<ParticipantData[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [sessionDuration, setSessionDuration] = useState('00:00:00')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [code, setCode] = useState('// Welcome to the interview platform!\n// Start coding here...\n')
  const [language, setLanguage] = useState('javascript')
  const [copied, setCopied] = useState(false)

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Initialize video streams
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Socket event handlers
  useEffect(() => {
    if (!socket || !session?.user) return

    // Join the interview room
    socket.emit('join-room', {
      sessionId,
      userId: session.user.id!,
      userName: session.user.name!
    })

    // Listen for participants updates
    socket.on('participants-updated', (participantList: ParticipantData[]) => {
      setParticipants(participantList)
    })

    // Listen for chat messages
    socket.on('chat-message', (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message])
      // Auto-scroll to bottom
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
        }
      }, 100)
    })

    // Listen for code changes
    socket.on('code-changed', ({ code: newCode, language: newLang }) => {
      setCode(newCode)
      setLanguage(newLang)
    })

    // Listen for session events
    socket.on('session-started', ({ startTime }) => {
      setSessionStartTime(new Date(startTime))
    })

    socket.on('user-left', ({ userName }) => {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        userId: 'system',
        userName: 'System',
        message: `${userName} left the interview`,
        timestamp: new Date().toISOString()
      }])
    })

    return () => {
      socket.off('participants-updated')
      socket.off('chat-message')
      socket.off('code-changed')
      socket.off('session-started')
      socket.off('user-left')
    }
  }, [socket, session, sessionId])

  // Session timer
  useEffect(() => {
    if (!sessionStartTime) return

    const interval = setInterval(() => {
      const now = new Date()
      const diff = now.getTime() - sessionStartTime.getTime()
      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setSessionDuration(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionStartTime])

  // Handle sending chat messages
  const sendMessage = useCallback(() => {
    if (!socket || !newMessage.trim() || !session?.user) return

    const message = {
      sessionId,
      userId: session.user.id!,
      userName: session.user.name!,
      message: newMessage.trim()
    }

    socket.emit('chat-message', message)
    setNewMessage('')
  }, [socket, newMessage, sessionId, session])

  // Handle code changes
  const handleCodeChange = useCallback((value: string | undefined) => {
    if (!socket || value === undefined) return
    setCode(value)
    socket.emit('code-changed', { sessionId, code: value, language })
  }, [socket, sessionId, language])

  // Handle language change
  const handleLanguageChange = useCallback((newLanguage: string) => {
    if (!socket) return
    setLanguage(newLanguage)
    socket.emit('code-changed', { sessionId, code, language: newLanguage })
  }, [socket, sessionId, code])

  // Handle leaving session
  const handleLeaveSession = useCallback(() => {
    if (socket) {
      socket.emit('leave-room', { sessionId, userId: session?.user?.id })
    }
    cleanup()
    router.push('/dashboard')
  }, [socket, sessionId, session, cleanup, router])

  // Copy session link
  const copySessionLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">Interview Session</h1>
          <Badge variant="outline" className="text-green-400 border-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            {isConnected ? 'Connected' : 'Connecting...'}
          </Badge>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="w-4 h-4" />
            <span>{sessionDuration}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Users className="w-4 h-4" />
            <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copySessionLink}
            className="text-white border-gray-600"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Share Link'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - Video */}
        <div className="flex-1 flex flex-col bg-gray-900">
          {/* Video Grid */}
          <div className="flex-1 p-4">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Local Video */}
              <Card className="relative overflow-hidden bg-gray-800 border-gray-700">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-blue-600 text-white">
                    You
                  </Badge>
                  {isAudioMuted && <MicOff className="w-4 h-4 text-red-400" />}
                  {isVideoMuted && <VideoOff className="w-4 h-4 text-red-400" />}
                  {isScreenSharing && <Monitor className="w-4 h-4 text-green-400" />}
                </div>
              </Card>

              {/* Remote Video */}
              <Card className="relative overflow-hidden bg-gray-800 border-gray-700">
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
                      <Avatar className="w-16 h-16 mx-auto mb-4">
                        <AvatarFallback>
                          {participants.length > 1 ? participants[1].name[0] : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-gray-400">Waiting for participant...</p>
                    </div>
                  </div>
                )}
                {participants.length > 1 && (
                  <div className="absolute bottom-4 left-4 flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-green-600 text-white">
                      {participants[1]?.name}
                    </Badge>
                    {participants[1]?.isAudioMuted && <MicOff className="w-4 h-4 text-red-400" />}
                    {participants[1]?.isVideoMuted && <VideoOff className="w-4 h-4 text-red-400" />}
                    {participants[1]?.isScreenSharing && <Monitor className="w-4 h-4 text-green-400" />}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Video Controls */}
          <div className="p-4 bg-gray-800 border-t border-gray-700">
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant={isAudioMuted ? "destructive" : "outline"}
                size="lg"
                onClick={toggleAudio}
                className="rounded-full"
              >
                {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              <Button
                variant={isVideoMuted ? "destructive" : "outline"}
                size="lg"
                onClick={toggleVideo}
                className="rounded-full"
              >
                {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </Button>

              <Button
                variant={isScreenSharing ? "default" : "outline"}
                size="lg"
                onClick={toggleScreenShare}
                className="rounded-full"
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="rounded-full"
              >
                <MessageSquare className="w-5 h-5" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="rounded-full"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </Button>

              <Button
                variant="destructive"
                size="lg"
                onClick={handleLeaveSession}
                className="rounded-full ml-8"
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="w-1/2 flex flex-col bg-gray-800 border-l border-gray-700">
          {/* Editor Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold">Code Editor</h2>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="go">Go</option>
            </select>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1">
            <MonacoEditor
              height="100%"
              language={language}
              value={code}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on'
              }}
            />
          </div>
        </div>

        {/* Chat Panel */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-800 border-l border-gray-700 flex flex-col"
            >
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-semibold">Chat</h3>
              </div>

              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
                <div className="space-y-4">
                  {chatMessages.map((message) => (
                    <div key={message.id} className="text-sm">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-blue-400">
                          {message.userName}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-300">{message.message}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-700 border-gray-600"
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button size="sm" onClick={sendMessage}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
