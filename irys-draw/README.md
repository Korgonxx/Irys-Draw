# 🎨 Irys Draw

A multiplayer drawing game built on Next.js where every round is permanently stored on Irys. Draw, guess, and create remixable art that lasts forever!

## ✨ Features

- **🎮 Multiplayer Gameplay**: Real-time drawing and guessing with Socket.io
- **🔗 Wallet Integration**: Connect with MetaMask or WalletConnect 
- **💾 Permanent Storage**: All rounds stored permanently on Irys
- **🔄 Remix System**: Fork and reinterpret past drawings
- **🗃️ Archive Explorer**: Browse and discover past rounds
- **🎨 Drawing Tools**: Full-featured canvas with colors, brushes, and eraser
- **⏱️ Timed Rounds**: 90-second rounds with live countdown
- **🏆 Scoring System**: Points for correct guesses

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- NPM or Yarn
- MetaMask or WalletConnect-compatible wallet

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd irys-draw
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

   This starts both the Next.js app (port 3000) and Socket.io server (port 3001).

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎮 How to Play

1. **Connect Wallet**: Use the "Connect Wallet" button to connect your Web3 wallet
2. **Create/Join Room**: Either create a new room or join an existing one by code
3. **Start Round**: Any player can start a new round
4. **Draw or Guess**: 
   - **Drawer**: Gets a secret word and draws it using the canvas tools
   - **Guessers**: Try to guess the word by typing in the chat
5. **Score Points**: First correct guess wins the round and earns points
6. **View Archive**: Browse past rounds in the Archive section

## 🏗️ Architecture

### Frontend (Next.js + React)
- **Pages**: Home lobby, Game room, Archive explorer
- **Components**: Drawing canvas, Wallet connection, Real-time chat
- **Hooks**: Socket.io client integration, Wagmi for wallet connection
- **Styling**: Tailwind CSS with custom Irys brand colors

### Backend (Socket.io Server)
- **Real-time Communication**: Player connections, drawing data, guesses
- **Game Management**: Room creation, round logic, scoring
- **Data Storage**: Temporary game state (rounds uploaded to Irys)

### Blockchain Integration
- **Wallets**: MetaMask, WalletConnect support via Wagmi
- **Storage**: Irys for permanent round storage
- **Networks**: Ethereum mainnet and Sepolia testnet

## 🔄 Irys Integration

Each completed round is stored on Irys with the following structure:

```json
{
  "type": "irys_draw_round",
  "drawer": "0xabc...",
  "word": "volcano", 
  "image_url": "https://gateway.irys.xyz/...drawing.png",
  "winner": "0xdef...",
  "guesses": [
    { "user": "0x111...", "guess": "mountain", "timestamp": "2025-01-08..." },
    { "user": "0xdef...", "guess": "volcano", "timestamp": "2025-01-08..." }
  ],
  "timestamp": "2025-01-08T18:44Z",
  "remixable": true,
  "parent_round_id": "optional_for_remixes"
}
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start full development environment (Next.js + Socket.io)
- `npm run dev:next` - Start only Next.js development server  
- `npm run dev:socket` - Start only Socket.io server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── page.tsx        # Home/lobby page
│   ├── room/[id]/      # Game room page
│   └── archive/        # Archive explorer
├── components/         # React components
│   ├── DrawingCanvas.tsx
│   ├── WalletConnect.tsx
│   └── providers.tsx
├── hooks/             # Custom React hooks
│   └── useSocket.ts
└── lib/               # Utilities and services
    ├── config.ts      # Wagmi configuration
    ├── irys.ts        # Irys integration
    └── socket-server.ts
```

## 🌐 Deployment

### Frontend (Vercel)
1. Connect repository to Vercel
2. Set environment variables
3. Deploy automatically on push

### Backend (Railway/Render)
1. Deploy the Socket.io server separately
2. Update `NEXT_PUBLIC_SOCKET_URL` to production URL
3. Configure CORS for production domain

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [Irys](https://irys.xyz) for permanent data storage
- [Socket.io](https://socket.io) for real-time communication  
- [Wagmi](https://wagmi.sh) for Web3 wallet integration
- [Next.js](https://nextjs.org) for the React framework
- [Tailwind CSS](https://tailwindcss.com) for styling

---

**Happy Drawing! 🎨**
