import { http, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { walletConnect, metaMask } from 'wagmi/connectors'

// Get projectId from https://cloud.walletconnect.com
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

const metadata = {
  name: 'Irys Draw',
  description: 'Multiplayer drawing game with permanent storage on Irys',
  url: 'https://irys-draw.vercel.app',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// Create wagmiConfig
const chains = [mainnet, sepolia] as const
export const config = createConfig({
  chains,
  connectors: [
    metaMask(),
    walletConnect({ projectId, metadata }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})

export const IRYS_NODE = 'https://devnet.irys.xyz'
export const IRYS_GATEWAY = 'https://gateway.irys.xyz'