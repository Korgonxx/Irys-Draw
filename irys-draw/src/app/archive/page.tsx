'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { irysService, type IrysRoundData } from '@/lib/irys'

export default function ArchivePage() {
  const { address } = useAccount()
  const [rounds, setRounds] = useState<IrysRoundData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'my-drawings' | 'won' | 'remixed'>('all')
  const [selectedRound, setSelectedRound] = useState<IrysRoundData | null>(null)
  const [remixes, setRemixes] = useState<IrysRoundData[]>([])

  useEffect(() => {
    loadRounds()
  }, [filter, address])
  
  // Note: loadRounds is not included in deps intentionally to avoid infinite loops

  const loadRounds = async () => {
    setLoading(true)
    try {
      let filters = {}
      
      if (filter === 'my-drawings' && address) {
        filters = { drawer: address }
      } else if (filter === 'won' && address) {
        // This would need to be implemented based on winner field
        filters = { hasWinner: true }
      } else if (filter === 'remixed') {
        filters = { remixable: true }
      }
      
      const roundsData = await irysService.searchRounds(filters)
      setRounds(roundsData)
    } catch (error) {
      console.error('Failed to load rounds:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewRound = async (round: IrysRoundData) => {
    setSelectedRound(round)
    
    // Load remixes for this round
    try {
      const remixData = await irysService.getRemixes(round.timestamp) // Using timestamp as ID for demo
      setRemixes(remixData)
    } catch (error) {
      console.error('Failed to load remixes:', error)
      setRemixes([])
    }
  }

  const handleRemix = (round: IrysRoundData) => {
    // For now, just show alert. In full implementation, this would open a remix interface
    alert(`Remix functionality would open here for round: ${round.word}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-irys-600 hover:text-irys-700">
                ← Back to Game
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🗃️ Archive</h1>
                <p className="text-sm text-gray-600">Browse and remix past rounds</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: '🌍 All Rounds' },
              { key: 'my-drawings', label: '🎨 My Drawings' },
              { key: 'won', label: '🏆 Rounds I Won' },
              { key: 'remixed', label: '🔄 Most Remixed' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === key
                    ? 'bg-irys-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          /* Loading State */
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-irys-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading rounds from Irys...</p>
          </div>
        ) : rounds.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No rounds found</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? 'No rounds have been uploaded to Irys yet.' 
                : 'No rounds match your current filter.'}
            </p>
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 bg-irys-500 text-white rounded-lg hover:bg-irys-600 transition-colors"
            >
              🎮 Start Playing
            </Link>
          </div>
        ) : (
          /* Rounds Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rounds.map((round, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => handleViewRound(round)}
              >
                {/* Drawing Preview */}
                <div className="aspect-square bg-gray-100 relative">
                  {round.image_url ? (
                    <img
                      src={round.image_url}
                      alt={`Drawing of ${round.word}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-4xl">🎨</span>
                    </div>
                  )}
                  
                  {/* Overlay with word */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-75 transition-all duration-200 flex items-center justify-center">
                    <div className="text-white text-center opacity-0 hover:opacity-100 transition-opacity">
                      <div className="text-2xl font-bold mb-2">{round.word}</div>
                      <div className="text-sm">Click to view details</div>
                    </div>
                  </div>
                </div>

                {/* Round Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      &quot;{round.word}&quot;
                    </h3>
                    <div className="flex items-center space-x-1">
                      {round.winner && <span className="text-green-500">🏆</span>}
                      {round.remixable && <span className="text-irys-500">🔄</span>}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    <div>By: {round.drawer.slice(0, 6)}...{round.drawer.slice(-4)}</div>
                    <div>{new Date(round.timestamp).toLocaleDateString()}</div>
                    <div>{round.guesses.length} guesses</div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewRound(round)
                      }}
                      className="flex-1 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      View Details
                    </button>
                    
                    {round.remixable && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemix(round)
                        }}
                        className="px-3 py-2 text-sm bg-irys-500 text-white rounded-lg hover:bg-irys-600 transition-colors"
                      >
                        🔄 Remix
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Round Detail Modal */}
      {selectedRound && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Round: &quot;{selectedRound.word}&quot;
                  </h2>
                  <p className="text-gray-600">
                    Drawn by {selectedRound.drawer.slice(0, 6)}...{selectedRound.drawer.slice(-4)} 
                    on {new Date(selectedRound.timestamp).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRound(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Drawing */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Drawing</h3>
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    {selectedRound.image_url ? (
                      <img
                        src={selectedRound.image_url}
                        alt={`Drawing of ${selectedRound.word}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-4xl">🎨</span>
                      </div>
                    )}
                  </div>
                  
                  {selectedRound.remixable && (
                    <button
                      onClick={() => handleRemix(selectedRound)}
                      className="w-full mt-4 py-3 bg-irys-500 text-white rounded-lg hover:bg-irys-600 transition-colors font-semibold"
                    >
                      🔄 Create Remix
                    </button>
                  )}
                </div>

                {/* Details */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Round Details</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Word</label>
                      <div className="px-3 py-2 bg-gray-50 rounded-lg font-mono text-lg">
                        {selectedRound.word}
                      </div>
                    </div>

                    {selectedRound.winner && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Winner</label>
                        <div className="px-3 py-2 bg-green-50 text-green-800 rounded-lg">
                          🏆 {selectedRound.winner.slice(0, 6)}...{selectedRound.winner.slice(-4)}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Guesses ({selectedRound.guesses.length})
                      </label>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {selectedRound.guesses.map((guess, index) => (
                          <div
                            key={index}
                            className={`px-3 py-2 rounded-lg text-sm ${
                              guess.isCorrect
                                ? 'bg-green-50 text-green-800'
                                : 'bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {guess.user.slice(0, 6)}...{guess.user.slice(-4)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(guess.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span>&quot;{guess.guess}&quot;</span>
                              {guess.isCorrect && <span>🎉</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Irys Link */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stored on Irys</label>
                      <a
                        href={`https://gateway.irys.xyz/${selectedRound.timestamp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 bg-irys-50 text-irys-700 rounded-lg hover:bg-irys-100 transition-colors text-sm"
                      >
                        🔗 View on Irys Gateway
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remixes */}
              {remixes.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Remixes ({remixes.length})
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {remixes.map((remix, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <div className="aspect-square bg-gray-100 rounded-lg mb-2">
                          {remix.image_url && (
                            <img
                              src={remix.image_url}
                              alt={`Remix of ${remix.word}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          )}
                        </div>
                                                 <div className="text-sm">
                           <div className="font-medium">&quot;{remix.word}&quot;</div>
                          <div className="text-gray-600">
                            By {remix.drawer.slice(0, 6)}...{remix.drawer.slice(-4)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}