import { Server as SocketIOServer } from 'socket.io'
import { createServer } from 'http'

export interface GameRoom {
  id: string
  name: string
  players: Player[]
  currentRound?: GameRound
  isPrivate: boolean
  createdAt: Date
  maxPlayers: number
}

export interface Player {
  id: string
  address: string
  name: string
  score: number
  isDrawer: boolean
}

export interface GameRound {
  id: string
  word: string
  drawer: string
  startTime: Date
  duration: number
  guesses: Guess[]
  winner?: string
  drawing: DrawingData[]
  ended: boolean
}

export interface Guess {
  player: string
  guess: string
  timestamp: Date
  isCorrect: boolean
}

export interface DrawingData {
  type: 'start' | 'draw' | 'end'
  x: number
  y: number
  color: string
  size: number
  timestamp: number
}

class GameManager {
  private rooms: Map<string, GameRoom> = new Map()
  private playerRooms: Map<string, string> = new Map()
  
  createRoom(name: string, isPrivate: boolean, creator: Player): GameRoom {
    const roomId = this.generateRoomId()
    const room: GameRoom = {
      id: roomId,
      name,
      players: [creator],
      isPrivate,
      createdAt: new Date(),
      maxPlayers: 8
    }
    
    this.rooms.set(roomId, room)
    this.playerRooms.set(creator.id, roomId)
    return room
  }
  
  joinRoom(roomId: string, player: Player): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room || room.players.length >= room.maxPlayers) {
      return null
    }
    
    room.players.push(player)
    this.playerRooms.set(player.id, roomId)
    return room
  }
  
  leaveRoom(playerId: string): GameRoom | null {
    const roomId = this.playerRooms.get(playerId)
    if (!roomId) return null
    
    const room = this.rooms.get(roomId)
    if (!room) return null
    
    room.players = room.players.filter(p => p.id !== playerId)
    this.playerRooms.delete(playerId)
    
    if (room.players.length === 0) {
      this.rooms.delete(roomId)
      return null
    }
    
    return room
  }
  
  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId)
  }
  
  getPublicRooms(): GameRoom[] {
    return Array.from(this.rooms.values()).filter(room => !room.isPrivate)
  }
  
  private generateRoomId(): string {
    return Math.random().toString(36).substr(2, 6).toUpperCase()
  }
}

export function createSocketServer(server: any) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  })
  
  const gameManager = new GameManager()
  
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)
    
    socket.on('create-room', ({ name, isPrivate, player }) => {
      const room = gameManager.createRoom(name, isPrivate, { ...player, id: socket.id })
      socket.join(room.id)
      socket.emit('room-created', room)
      
      if (!isPrivate) {
        io.emit('public-rooms-updated', gameManager.getPublicRooms())
      }
    })
    
    socket.on('join-room', ({ roomId, player }) => {
      const room = gameManager.joinRoom(roomId, { ...player, id: socket.id })
      if (room) {
        socket.join(roomId)
        socket.emit('room-joined', room)
        socket.to(roomId).emit('player-joined', { ...player, id: socket.id })
        
        if (!room.isPrivate) {
          io.emit('public-rooms-updated', gameManager.getPublicRooms())
        }
      } else {
        socket.emit('join-error', 'Room not found or full')
      }
    })
    
    socket.on('leave-room', () => {
      const room = gameManager.leaveRoom(socket.id)
      if (room) {
        socket.to(room.id).emit('player-left', socket.id)
        socket.leave(room.id)
        
        if (!room.isPrivate) {
          io.emit('public-rooms-updated', gameManager.getPublicRooms())
        }
      }
    })
    
    socket.on('start-round', ({ roomId, word }) => {
      const room = gameManager.getRoom(roomId)
      if (room && room.players.find(p => p.id === socket.id)) {
        // Set a random player as drawer if no current round
        if (!room.currentRound) {
          const drawer = room.players[Math.floor(Math.random() * room.players.length)]
          room.players.forEach(p => p.isDrawer = p.id === drawer.id)
          
          room.currentRound = {
            id: Date.now().toString(),
            word,
            drawer: drawer.id,
            startTime: new Date(),
            duration: 90000, // 90 seconds
            guesses: [],
            drawing: [],
            ended: false
          }
          
          // Send word only to drawer
          socket.to(drawer.id).emit('round-started', { ...room.currentRound, word })
          // Send round without word to other players
          socket.to(roomId).emit('round-started', { 
            ...room.currentRound, 
            word: '•'.repeat(word.length) 
          })
          
          // Auto-end round after duration
          setTimeout(() => {
            if (room.currentRound && !room.currentRound.ended) {
              room.currentRound.ended = true
              io.to(roomId).emit('round-ended', room.currentRound)
            }
          }, room.currentRound.duration)
        }
      }
    })
    
    socket.on('drawing-data', ({ roomId, drawingData }) => {
      socket.to(roomId).emit('drawing-update', drawingData)
      
      const room = gameManager.getRoom(roomId)
      if (room?.currentRound) {
        room.currentRound.drawing.push(drawingData)
      }
    })
    
    socket.on('guess', ({ roomId, guess }) => {
      const room = gameManager.getRoom(roomId)
      if (room?.currentRound && !room.currentRound.ended) {
        const player = room.players.find(p => p.id === socket.id)
        if (player && !player.isDrawer) {
          const guessData: Guess = {
            player: socket.id,
            guess,
            timestamp: new Date(),
            isCorrect: guess.toLowerCase() === room.currentRound.word.toLowerCase()
          }
          
          room.currentRound.guesses.push(guessData)
          
          if (guessData.isCorrect && !room.currentRound.winner) {
            room.currentRound.winner = socket.id
            room.currentRound.ended = true
            player.score += 10
            
            io.to(roomId).emit('correct-guess', { 
              player: socket.id, 
              word: room.currentRound.word 
            })
            io.to(roomId).emit('round-ended', room.currentRound)
          } else {
            io.to(roomId).emit('new-guess', {
              player: socket.id,
              guess,
              playerName: player.name
            })
          }
        }
      }
    })
    
    socket.on('get-public-rooms', () => {
      socket.emit('public-rooms', gameManager.getPublicRooms())
    })
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)
      const room = gameManager.leaveRoom(socket.id)
      if (room) {
        socket.to(room.id).emit('player-left', socket.id)
        
        if (!room.isPrivate) {
          io.emit('public-rooms-updated', gameManager.getPublicRooms())
        }
      }
    })
  })
  
  return io
}