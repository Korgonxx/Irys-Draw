'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { WalletConnect } from '@/components/WalletConnect'
import { useSocket } from '@/hooks/useSocket'
import type { GameRoom } from '@/lib/socket-server'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { address, isConnected } = useAccount()
  const { socket, isConnected: socketConnected, createRoom, joinRoom, getPublicRooms } = useSocket()
  const [publicRooms, setPublicRooms] = useState<GameRoom[]>([])
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [joinRoomId, setJoinRoomId] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (socket) {
      socket.on('public-rooms', (rooms: GameRoom[]) => {
        setPublicRooms(rooms)
      })

      socket.on('public-rooms-updated', (rooms: GameRoom[]) => {
        setPublicRooms(rooms)
      })

      socket.on('room-created', (room: GameRoom) => {
        router.push(`/room/${room.id}`)
      })

      socket.on('room-joined', (room: GameRoom) => {
        router.push(`/room/${room.id}`)
      })

      socket.on('join-error', (error: string) => {
        alert(`Failed to join room: ${error}`)
      })

      // Get initial public rooms
      getPublicRooms()

      return () => {
        socket.off('public-rooms')
        socket.off('public-rooms-updated')
        socket.off('room-created')
        socket.off('room-joined')
        socket.off('join-error')
      }
    }
  }, [socket, getPublicRooms, router])

  const handleCreateRoom = () => {
    if (!isConnected || !address || !roomName.trim()) return

    createRoom(roomName.trim(), isPrivate, {
      address,
      name: address.slice(0, 6) + '...' + address.slice(-4)
    })

    setShowCreateRoom(false)
    setRoomName('')
  }

  const handleJoinRoom = (roomId: string) => {
    if (!isConnected || !address) return

    joinRoom(roomId, {
      address,
      name: address.slice(0, 6) + '...' + address.slice(-4)
    })
  }

  const handleJoinByCode = () => {
    if (!joinRoomId.trim()) return
    handleJoinRoom(joinRoomId.trim().toUpperCase())
    setJoinRoomId('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-irys-50 to-white">
      {/* Header */}
      <header className="border-b border-irys-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-irys-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">🎨</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Irys Draw</h1>
                <p className="text-sm text-gray-600">Draw, guess, store forever</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                href="/archive" 
                className="px-4 py-2 text-irys-600 hover:text-irys-700 font-medium transition-colors"
              >
                🗃️ Archive
              </Link>
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!isConnected ? (
          /* Welcome Screen */
          <div className="text-center py-20">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Welcome to Irys Draw
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                A multiplayer drawing game where every round is stored permanently on Irys. 
                Draw, guess, and create remixable art that lasts forever.
              </p>
              
              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-irys-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎨</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Draw & Guess</h3>
                  <p className="text-gray-600">Take turns drawing and guessing words in real-time</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-irys-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💾</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Store Forever</h3>
                  <p className="text-gray-600">Every round is permanently stored on Irys</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-irys-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔄</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Remix & Fork</h3>
                  <p className="text-gray-600">Create new interpretations of past drawings</p>
                </div>
              </div>
              
              <div className="bg-irys-50 border border-irys-200 rounded-xl p-6">
                <p className="text-irys-800 font-medium mb-4">
                  Connect your wallet to start playing
                </p>
                <WalletConnect />
              </div>
            </div>
          </div>
        ) : (
          /* Game Lobby */
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Choose Your Game
              </h2>
              <p className="text-gray-600">
                Create a new room or join an existing one
              </p>
            </div>

            {/* Connection Status */}
            <div className="flex justify-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                socketConnected 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  socketConnected ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <span className="text-sm font-medium">
                  {socketConnected ? 'Connected' : 'Connecting...'}
                </span>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Create Room */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  🎯 Create New Room
                </h3>
                
                {!showCreateRoom ? (
                  <button
                    onClick={() => setShowCreateRoom(true)}
                    className="w-full py-4 bg-irys-500 text-white rounded-xl font-semibold hover:bg-irys-600 transition-colors"
                  >
                    Create Room
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Room Name
                      </label>
                      <input
                        type="text"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="Enter room name..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irys-500 focus:border-transparent"
                        maxLength={30}
                      />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="private"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        className="w-4 h-4 text-irys-600 border-gray-300 rounded focus:ring-irys-500"
                      />
                      <label htmlFor="private" className="text-sm text-gray-700">
                        Private room (invite only)
                      </label>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateRoom}
                        disabled={!roomName.trim()}
                        className="flex-1 py-3 bg-irys-500 text-white rounded-lg font-semibold hover:bg-irys-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateRoom(false)
                          setRoomName('')
                          setIsPrivate(false)
                        }}
                        className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Join Room */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  🔗 Join by Code
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Room Code
                    </label>
                    <input
                      type="text"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                      placeholder="Enter 6-digit code..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irys-500 focus:border-transparent font-mono"
                      maxLength={6}
                    />
                  </div>
                  
                  <button
                    onClick={handleJoinByCode}
                    disabled={joinRoomId.length !== 6}
                    className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Join Room
                  </button>
                </div>
              </div>
            </div>

            {/* Public Rooms */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  🌍 Public Rooms
                </h3>
                <button
                  onClick={getPublicRooms}
                  className="px-4 py-2 text-irys-600 hover:text-irys-700 transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>
              
              {publicRooms.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No public rooms available</p>
                  <p className="text-sm text-gray-400 mt-1">Be the first to create one!</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {publicRooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900">{room.name}</h4>
                        <p className="text-sm text-gray-500">
                          {room.players.length}/{room.maxPlayers} players • Code: {room.id}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleJoinRoom(room.id)}
                        disabled={room.players.length >= room.maxPlayers}
                        className="px-4 py-2 bg-irys-500 text-white rounded-lg hover:bg-irys-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {room.players.length >= room.maxPlayers ? 'Full' : 'Join'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
