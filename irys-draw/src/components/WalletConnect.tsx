'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useState } from 'react'

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [showConnectors, setShowConnectors] = useState(false)

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-3 py-2 bg-irys-50 text-irys-700 rounded-lg border border-irys-200">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg border border-red-200 hover:bg-red-200 transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowConnectors(!showConnectors)}
        disabled={isPending}
        className="px-6 py-3 bg-irys-500 text-white rounded-xl font-semibold hover:bg-irys-600 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>
      
      {showConnectors && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-48">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => {
                connect({ connector })
                setShowConnectors(false)
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-irys-100 rounded-lg flex items-center justify-center">
                  <span className="text-irys-600 font-semibold">
                    {connector.name === 'MetaMask' ? '🦊' : '🔗'}
                  </span>
                </div>
                <span className="font-medium">{connector.name}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}