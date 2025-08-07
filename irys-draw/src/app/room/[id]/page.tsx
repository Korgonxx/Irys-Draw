'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useSocket } from '@/hooks/useSocket'
import { DrawingCanvas } from '@/components/DrawingCanvas'
import type { GameRoom, GameRound, Player, DrawingData } from '@/lib/socket-server'

export default function GameRoomPage() {
  const params = useParams()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { socket, sendDrawing, sendGuess, leaveRoom } = useSocket()
  
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [guess, setGuess] = useState('')
  const [guesses, setGuesses] = useState<Array<{ player: string, guess: string, playerName: string }>>([])
  const [isDrawer, setIsDrawer] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const roomId = params.id as string

  useEffect(() => {
    if (!isConnected || !address) {
      router.push('/')
      return
    }
  }, [isConnected, address, router])

  useEffect(() => {
    if (socket) {
      // Join the room when component mounts
      socket.emit('join-room', {
        roomId,
        player: {
          address,
          name: address?.slice(0, 6) + '...' + address?.slice(-4)
        }
      })

      socket.on('room-joined', (roomData: GameRoom) => {
        setRoom(roomData)
        const player = roomData.players.find(p => p.address === address)
        setIsDrawer(player?.isDrawer || false)
      })

      socket.on('player-joined', (player: Player) => {
        setRoom(prev => prev ? {
          ...prev,
          players: [...prev.players, player]
        } : null)
      })

      socket.on('player-left', (playerId: string) => {
        setRoom(prev => prev ? {
          ...prev,
          players: prev.players.filter(p => p.id !== playerId)
        } : null)
      })

      socket.on('round-started', (round: GameRound) => {
        setCurrentRound(round)
        setGuesses([])
        setTimeLeft(90) // 90 seconds
        
        // Clear canvas
        const canvas = canvasRef.current as any
        if (canvas?.clearCanvas) {
          canvas.clearCanvas()
        }
        
        // Start countdown
        const timer = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      })

      socket.on('drawing-update', (drawingData: DrawingData) => {
        const canvas = canvasRef.current as any
        if (canvas?.handleRemoteDrawing) {
          canvas.handleRemoteDrawing(drawingData)
        }
      })

      socket.on('new-guess', ({ player, guess, playerName }: { player: string, guess: string, playerName: string }) => {
        setGuesses(prev => [...prev, { player, guess, playerName }])
      })

      socket.on('correct-guess', ({ player, word }: { player: string, word: string }) => {
        setGuesses(prev => [...prev, { 
          player, 
          guess: `🎉 ${word} - CORRECT!`, 
          playerName: room?.players.find(p => p.id === player)?.name || 'Someone'
        }])
      })

      socket.on('round-ended', (round: GameRound) => {
        setCurrentRound(round)
        setTimeLeft(0)
        
        // TODO: Upload to Irys here
        setTimeout(() => {
          alert(`Round ended! ${round.winner ? 'Winner: ' + room?.players.find(p => p.id === round.winner)?.name : 'No winner'}`)
        }, 1000)
      })

      socket.on('join-error', (error: string) => {
        alert(`Error: ${error}`)
        router.push('/')
      })

      return () => {
        socket.off('room-joined')
        socket.off('player-joined')
        socket.off('player-left')
        socket.off('round-started')
        socket.off('drawing-update')
        socket.off('new-guess')
        socket.off('correct-guess')
        socket.off('round-ended')
        socket.off('join-error')
      }
    }
  }, [socket, roomId, address, router, room?.players])

  const handleDrawingUpdate = (data: DrawingData) => {
    if (socket && isDrawer) {
      sendDrawing(roomId, data)
    }
  }

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault()
    if (!guess.trim() || isDrawer || !currentRound || currentRound.ended) return
    
    sendGuess(roomId, guess.trim())
    setGuess('')
  }

  const handleStartRound = () => {
    if (socket) {
      socket.emit('start-round', { roomId })
    }
  }

  const handleLeaveRoom = () => {
    leaveRoom()
    router.push('/')
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-irys-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Joining room...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLeaveRoom}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Leave Room
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{room.name}</h1>
              <p className="text-sm text-gray-500">Room Code: {room.id}</p>
            </div>
          </div>
          
          {currentRound && !currentRound.ended && (
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-irys-600'}`}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-500">Time Left</div>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Players */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Players ({room.players.length})</h3>
            <div className="space-y-2">
              {room.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${player.isDrawer ? 'bg-irys-500' : 'bg-gray-400'}`} />
                    <span className="text-sm font-medium">{player.name}</span>
                    {player.isDrawer && <span className="text-xs bg-irys-100 text-irys-700 px-2 py-1 rounded">Drawing</span>}
                  </div>
                  <span className="text-sm text-gray-500">{player.score} pts</span>
                </div>
              ))}
            </div>
          </div>

          {/* Game Status */}
          <div className="p-4 border-b border-gray-200">
            {!currentRound ? (
              <div className="text-center">
                <p className="text-gray-600 mb-4">Ready to start?</p>
                <button
                  onClick={handleStartRound}
                  className="w-full py-2 bg-irys-500 text-white rounded-lg hover:bg-irys-600 transition-colors"
                >
                  Start Round
                </button>
              </div>
            ) : (
              <div className="text-center">
                {isDrawer ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Your word is:</p>
                    <p className="text-xl font-bold text-irys-600">{currentRound.word}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Word to guess:</p>
                    <p className="text-xl font-mono tracking-wider">{typeof currentRound.word === 'string' && currentRound.word.includes('•') ? currentRound.word : '•'.repeat(currentRound.word?.length || 0)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat/Guesses */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Guesses</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {guesses.map((guess, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium text-gray-700">{guess.playerName}:</span>
                  <span className={`ml-2 ${guess.guess.includes('CORRECT') ? 'text-green-600 font-bold' : 'text-gray-600'}`}>
                    {guess.guess}
                  </span>
                </div>
              ))}
            </div>

            {/* Guess Input */}
            {!isDrawer && currentRound && !currentRound.ended && (
              <div className="p-4 border-t border-gray-200">
                <form onSubmit={handleGuess} className="flex space-x-2">
                  <input
                    type="text"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="Enter your guess..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irys-500 focus:border-transparent"
                    disabled={!currentRound || currentRound.ended}
                  />
                  <button
                    type="submit"
                    disabled={!guess.trim() || !currentRound || currentRound.ended}
                    className="px-4 py-2 bg-irys-500 text-white rounded-lg hover:bg-irys-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Guess
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 p-6 flex items-center justify-center">
          <DrawingCanvas
            width={800}
            height={600}
            isDrawer={isDrawer && currentRound && !currentRound.ended}
            onDrawingUpdate={handleDrawingUpdate}
            className="max-w-full"
          />
        </div>
      </div>
    </div>
  )
}