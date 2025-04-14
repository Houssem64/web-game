import { create } from 'zustand';

export const useGameStore = create((set) => ({
  // Player data
  players: {}, // Map of player IDs to player data
  currentPlayerId: null,
  
  // Game state
  gameStarted: false,
  
  // Actions
  setPlayers: (players) => set({ players }),
  updatePlayer: (id, data) => set((state) => ({
    players: {
      ...state.players,
      [id]: {
        ...state.players[id],
        ...data
      }
    }
  })),
  addPlayer: (id, data) => set((state) => ({
    players: {
      ...state.players,
      [id]: data
    }
  })),
  removePlayer: (id) => set((state) => {
    const newPlayers = { ...state.players };
    delete newPlayers[id];
    return { players: newPlayers };
  }),
  setCurrentPlayerId: (id) => set({ currentPlayerId: id }),
  setGameStarted: (started) => set({ gameStarted: started }),
  
  // Reset the game state
  resetGame: () => set({
    players: {},
    currentPlayerId: null,
    gameStarted: false
  })
}));
