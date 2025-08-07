import Irys from '@irys/sdk'
import type { GameRound, Player } from './socket-server'

export interface IrysRoundData {
  type: 'irys_draw_round'
  drawer: string
  word: string
  image_url: string
  winner?: string
  guesses: Array<{
    user: string
    guess: string
    timestamp: string
    isCorrect: boolean
  }>
  timestamp: string
  remixable: boolean
  parent_round_id?: string
  drawing_data: string // Base64 encoded image
}

export class IrysService {
  private irys: Irys | null = null
  
  async initialize(privateKey: string) {
    try {
      this.irys = new Irys({
        network: 'devnet',
        token: 'ethereum',
        key: privateKey,
      })
      
      console.log('Irys initialized successfully')
      return true
    } catch (error) {
      console.error('Failed to initialize Irys:', error)
      return false
    }
  }
  
  async uploadRound(
    round: GameRound, 
    players: Player[], 
    canvasDataUrl: string,
    parentRoundId?: string
  ): Promise<string | null> {
    if (!this.irys) {
      console.error('Irys not initialized')
      return null
    }
    
    try {
      // Convert canvas data URL to base64
      const base64Data = canvasDataUrl.split(',')[1]
      
      // Upload image first
      const imageUpload = await this.irys.upload(base64Data, {
        tags: [
          { name: 'Content-Type', value: 'image/png' },
          { name: 'App-Name', value: 'IrysDraw' },
          { name: 'Type', value: 'drawing' },
          { name: 'Round-Id', value: round.id },
        ]
      })
      
      const imageUrl = `https://gateway.irys.xyz/${imageUpload.id}`
      
      // Prepare round metadata
      const roundData: IrysRoundData = {
        type: 'irys_draw_round',
        drawer: round.drawer,
        word: round.word,
        image_url: imageUrl,
        winner: round.winner,
        guesses: round.guesses.map(guess => ({
          user: guess.player,
          guess: guess.guess,
          timestamp: guess.timestamp.toISOString(),
          isCorrect: guess.isCorrect
        })),
        timestamp: round.startTime.toISOString(),
        remixable: true,
        parent_round_id: parentRoundId,
        drawing_data: base64Data
      }
      
      // Upload metadata
      const metadataUpload = await this.irys.upload(JSON.stringify(roundData), {
        tags: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'App-Name', value: 'IrysDraw' },
          { name: 'Type', value: 'round' },
          { name: 'Round-Id', value: round.id },
          { name: 'Drawer', value: round.drawer },
          { name: 'Word', value: round.word },
          { name: 'Winner', value: round.winner || 'none' },
          { name: 'Remixable', value: 'true' },
          ...(parentRoundId ? [{ name: 'Parent-Round-Id', value: parentRoundId }] : [])
        ]
      })
      
      console.log('Round uploaded to Irys:', metadataUpload.id)
      return metadataUpload.id
      
    } catch (error) {
      console.error('Failed to upload round to Irys:', error)
      return null
    }
  }
  
  async getRound(roundId: string): Promise<IrysRoundData | null> {
    try {
      const response = await fetch(`https://gateway.irys.xyz/${roundId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch round')
      }
      
      const data = await response.json()
      return data as IrysRoundData
      
    } catch (error) {
      console.error('Failed to get round from Irys:', error)
      return null
    }
  }
  
  async searchRounds(filters?: {
    drawer?: string
    word?: string
    hasWinner?: boolean
    remixable?: boolean
    limit?: number
  }): Promise<IrysRoundData[]> {
    try {
      // Build GraphQL query for Irys
      let query = `
        query {
          transactions(
            first: ${filters?.limit || 50}
            tags: [
              { name: "App-Name", values: ["IrysDraw"] }
              { name: "Type", values: ["round"] }
      `
      
      if (filters?.drawer) {
        query += `{ name: "Drawer", values: ["${filters.drawer}"] }`
      }
      
      if (filters?.word) {
        query += `{ name: "Word", values: ["${filters.word}"] }`
      }
      
      if (filters?.hasWinner !== undefined) {
        query += `{ name: "Winner", values: ${filters.hasWinner ? '["none"]' : '"none"'} }`
      }
      
      if (filters?.remixable !== undefined) {
        query += `{ name: "Remixable", values: ["${filters.remixable}"] }`
      }
      
      query += `
            ]
          ) {
            edges {
              node {
                id
                tags {
                  name
                  value
                }
              }
            }
          }
        }
      `
      
      const response = await fetch('https://devnet.irys.xyz/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      })
      
      const result = await response.json()
      const rounds: IrysRoundData[] = []
      
      for (const edge of result.data.transactions.edges) {
        const roundData = await this.getRound(edge.node.id)
        if (roundData) {
          rounds.push(roundData)
        }
      }
      
      return rounds
      
    } catch (error) {
      console.error('Failed to search rounds:', error)
      return []
    }
  }
  
  async getRemixes(roundId: string): Promise<IrysRoundData[]> {
    return this.searchRounds({ 
      remixable: true,
      limit: 20 
    }).then(rounds => 
      rounds.filter(round => round.parent_round_id === roundId)
    )
  }
  
  async fundNode(amount: string): Promise<boolean> {
    if (!this.irys) {
      console.error('Irys not initialized')
      return false
    }
    
    try {
      const fundTx = await this.irys.fund(amount)
      console.log('Funded Irys node:', fundTx)
      return true
    } catch (error) {
      console.error('Failed to fund Irys node:', error)
      return false
    }
  }
  
  async getBalance(): Promise<string> {
    if (!this.irys) {
      return '0'
    }
    
    try {
      const balance = await this.irys.getLoadedBalance()
      return balance.toString()
    } catch (error) {
      console.error('Failed to get balance:', error)
      return '0'
    }
  }
}

export const irysService = new IrysService()