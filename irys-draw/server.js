const { createServer } = require('http')
const { Server } = require('socket.io')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000
const socketPort = process.env.SOCKET_PORT || 3001

// Game management classes and interfaces
class GameManager {
  constructor() {
    this.rooms = new Map()
    this.playerRooms = new Map()
  }
  
  createRoom(name, isPrivate, creator) {
    const roomId = this.generateRoomId()
    const room = {
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
  
  joinRoom(roomId, player) {
    const room = this.rooms.get(roomId)
    if (!room || room.players.length >= room.maxPlayers) {
      return null
    }
    
    room.players.push(player)
    this.playerRooms.set(player.id, roomId)
    return room
  }
  
  leaveRoom(playerId) {
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
  
  getRoom(roomId) {
    return this.rooms.get(roomId)
  }
  
  getPublicRooms() {
    return Array.from(this.rooms.values()).filter(room => !room.isPrivate)
  }
  
  generateRoomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase()
  }
}

// Create Socket.io server
const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: dev ? 'http://localhost:3000' : process.env.FRONTEND_URL,
    methods: ['GET', 'POST']
  }
})

const gameManager = new GameManager()

// Word list for random word generation
const words = [
  'cat', 'dog', 'house', 'car', 'tree', 'flower', 'book', 'phone', 'computer', 'chair',
  'table', 'mountain', 'ocean', 'sun', 'moon', 'star', 'fish', 'bird', 'butterfly', 'rainbow',
  'pizza', 'cake', 'apple', 'banana', 'guitar', 'piano', 'elephant', 'lion', 'tiger', 'bear',
  'castle', 'bridge', 'airplane', 'boat', 'bicycle', 'umbrella', 'balloon', 'snowman', 'volcano', 'island'
]

function getRandomWord() {
  return words[Math.floor(Math.random() * words.length)]
}

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
        
        const selectedWord = word || getRandomWord()
        
        room.currentRound = {
          id: Date.now().toString(),
          word: selectedWord,
          drawer: drawer.id,
          startTime: new Date(),
          duration: 90000, // 90 seconds
          guesses: [],
          drawing: [],
          ended: false
        }
        
        // Send word only to drawer
        io.to(drawer.id).emit('round-started', { ...room.currentRound, word: selectedWord })
        // Send round without word to other players
        socket.to(roomId).emit('round-started', { 
          ...room.currentRound, 
          word: '•'.repeat(selectedWord.length) 
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
        const guessData = {
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

httpServer.listen(socketPort, () => {
  console.log(`Socket.io server running on port ${socketPort}`)
})

// Start Next.js app only in development
if (dev) {
  console.log('Starting Next.js development server...')
  const app = next({ dev, hostname, port })
  const handle = app.getRequestHandler()
  
  app.prepare().then(() => {
    const nextServer = createServer(async (req, res) => {
      try {
        await handle(req, res)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    })
    
    nextServer.listen(port, (err) => {
      if (err) throw err
      console.log(`Next.js server running on http://${hostname}:${port}`)
    })
  }).catch((ex) => {
    console.error('Failed to start Next.js server:', ex)
    process.exit(1)
  })
} else {
  console.log('Production mode: Use "npm start" to run Next.js server')
}