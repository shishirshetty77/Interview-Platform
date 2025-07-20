'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Video, Users } from 'lucide-react'
import { SocketWarning } from '@/components/socket-warning'

export default function Home() {
  const router = useRouter()
  const [roomId, setRoomId] = useState('')
  
  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    router.push(`/call/${newRoomId}`)
  }
  
  const joinRoom = () => {
    if (roomId.trim()) {
      router.push(`/call/${roomId.trim()}`)
    }
  }
  
  const quickTest = () => {
    router.push('/test-call')
  }
  
  return (
    <>
      <SocketWarning />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <Video className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Video Call Platform</h1>
          <p className="text-gray-300 text-lg">Start or join a video call with friends and colleagues</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Create Room */}
          <Card className="bg-white/10 backdrop-blur-lg border border-white/20 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Create Room
              </CardTitle>
              <CardDescription className="text-gray-300">
                Start a new video call room
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={createRoom} className="w-full bg-blue-600 hover:bg-blue-700">
                Create New Room
              </Button>
            </CardContent>
          </Card>
          
          {/* Join Room */}
          <Card className="bg-white/10 backdrop-blur-lg border border-white/20 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Join Room
              </CardTitle>
              <CardDescription className="text-gray-300">
                Enter a room ID to join
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="Enter Room ID"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
              />
              <Button 
                onClick={joinRoom} 
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={!roomId.trim()}
              >
                Join Room
              </Button>
            </CardContent>
          </Card>
          
          {/* Quick Test */}
          <Card className="bg-white/10 backdrop-blur-lg border border-white/20 text-white">
            <CardHeader>
              <CardTitle>Quick Test</CardTitle>
              <CardDescription className="text-gray-300">
                Test your camera and microphone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={quickTest} 
                variant="outline" 
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Test Camera/Mic
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-8 text-gray-400 text-sm">
          <p>💡 <strong>How to test:</strong></p>
          <ol className="mt-2 space-y-1">
            <li>1. Create a room and copy the URL</li>
            <li>2. Open the URL in a new tab/window or share with someone</li>
            <li>3. Join with different names to test video calling</li>
          </ol>
        </div>
        </div>
      </div>
    </>
  )
}
