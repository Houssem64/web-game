import { create } from 'zustand';

export const useGameStore = create((set) => ({
  // Player data
  players: {}, // Map of player IDs to player data
  currentPlayerId: null,
  
  // Game state
  gameStarted: false,
  gamePhase: 'waiting', // waiting, announcement, quiz, elimination, finished
  currentRound: 0,
  totalRounds: 5,
  
  // Quiz state
  currentQuestion: null,
  timeRemaining: 0,
  answers: {}, // Map of player IDs to their answers
  scores: {}, // Map of player IDs to their scores
  eliminatedPlayers: [], // Array of player IDs that have been eliminated
  
  // Announcement state
  announcementMessage: '',
  announcementDuration: 0,
  
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
  
  // Quiz game actions
  setGamePhase: (phase) => set({ gamePhase: phase }),
  setCurrentRound: (round) => set({ currentRound: round }),
  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  
  // Announcement actions
  setAnnouncement: (message, duration) => set({
    announcementMessage: message,
    announcementDuration: duration
  }),
  
  // Utility method to update multiple game state properties at once
  updateGameState: (stateUpdates) => set((state) => ({
    ...state,
    ...stateUpdates
  })),
  
  submitAnswer: (playerId, answer, timeSpent) => set((state) => {
    // Save the player's answer
    const newAnswers = { ...state.answers };
    newAnswers[playerId] = { answer, timeSpent };
    
    return { answers: newAnswers };
  }),
  
  updateScores: (questionResults) => set((state) => {
    const newScores = { ...state.scores };
    
    // Update each player's score based on question results
    Object.entries(questionResults).forEach(([playerId, result]) => {
      newScores[playerId] = (newScores[playerId] || 0) + result.points;
    });
    
    return { scores: newScores };
  }),
  
  eliminatePlayer: (playerId) => set((state) => ({
    eliminatedPlayers: [...state.eliminatedPlayers, playerId]
  })),
  
  // Reset quiz state
  resetQuiz: () => set({
    currentQuestion: null,
    timeRemaining: 0,
    answers: {},
  }),
  
  // Reset the entire game state
  resetGame: () => set({
    players: {},
    currentPlayerId: null,
    gameStarted: false,
    gamePhase: 'waiting',
    currentRound: 0,
    currentQuestion: null,
    timeRemaining: 0,
    answers: {},
    scores: {},
    eliminatedPlayers: [],
    announcementMessage: '',
    announcementDuration: 0
  })
}));
