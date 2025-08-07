'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { GameRoom, Player, GameRound, DrawingData } from '@/lib/socket-server'

interface UseSocketReturn {
  socket: Socket | null
  isConnected: boolean
  createRoom: (name: string, isPrivate: boolean, player: Omit<Player, 'id' | 'isDrawer' | 'score'>) => void
  joinRoom: (roomId: string, player: Omit<Player, 'id' | 'isDrawer' | 'score'>) => void
  leaveRoom: () => void
  startRound: (roomId: string, word: string) => void
  sendDrawing: (roomId: string, drawingData: DrawingData) => void
  sendGuess: (roomId: string, guess: string) => void
  getPublicRooms: () => void
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin
      : 'http://localhost:3001'

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('Connected to socket server')
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from socket server')
      setIsConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  const createRoom = (name: string, isPrivate: boolean, player: Omit<Player, 'id' | 'isDrawer' | 'score'>) => {
    if (socket) {
      socket.emit('create-room', { 
        name, 
        isPrivate, 
        player: { ...player, score: 0, isDrawer: false } 
      })
    }
  }

  const joinRoom = (roomId: string, player: Omit<Player, 'id' | 'isDrawer' | 'score'>) => {
    if (socket) {
      socket.emit('join-room', { 
        roomId, 
        player: { ...player, score: 0, isDrawer: false } 
      })
    }
  }

  const leaveRoom = () => {
    if (socket) {
      socket.emit('leave-room')
    }
  }

  const startRound = (roomId: string, word: string) => {
    if (socket) {
      socket.emit('start-round', { roomId, word })
    }
  }

  const sendDrawing = (roomId: string, drawingData: DrawingData) => {
    if (socket) {
      socket.emit('drawing-data', { roomId, drawingData })
    }
  }

  const sendGuess = (roomId: string, guess: string) => {
    if (socket) {
      socket.emit('guess', { roomId, guess })
    }
  }

  const getPublicRooms = () => {
    if (socket) {
      socket.emit('get-public-rooms')
    }
  }

  return {
    socket,
    isConnected,
    createRoom,
    joinRoom,
    leaveRoom,
    startRound,
    sendDrawing,
    sendGuess,
    getPublicRooms,
  }
}