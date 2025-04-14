import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useConnection } from '../hooks/useConnection';
import AnswerButton from './UI/AnswerButton';

// Add custom styles for the quiz screen
const styles = {
  quizScreen: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '12px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '110%',
    backgroundColor: 'rgba(10, 10, 60, 0.85)',
    border: '2px solid #3355aa',
    borderRadius: '8px',
    boxShadow: 'inset 0 0 40px rgba(50, 100, 255, 0.3)'
  },
  quizHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    padding: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: '4px',
    borderBottom: '2px solid #3366cc'
  },
  questionContainer: {
    padding: '16px',
    backgroundColor: 'rgba(0, 20, 80, 0.6)',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '140%',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#ffffff',
    textShadow: '0 0 8px rgba(50, 100, 255, 0.8)',
    boxShadow: '0 0 15px rgba(0, 50, 200, 0.5)',
    border: '1px solid #4466cc'
  },
  announcementContainer: {
    padding: '20px',
    backgroundColor: 'rgba(30, 60, 150, 0.6)',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '140%',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#ffdd33',
    textShadow: '0 0 10px rgba(255, 255, 100, 0.5)',
    border: '2px solid #5577dd'
  },
  answersContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
    marginBottom: '15px'
  },
  waitingMessage: {
    textAlign: 'center',
    marginTop: '10px',
    color: '#ffcc00',
    fontWeight: 'bold',
    textShadow: '0 0 8px rgba(255, 200, 0, 0.5)'
  },
  gameTitle: {
    textAlign: 'center',
    color: '#ffcc00',
    fontSize: '48px',
    fontWeight: 'bold',
    textShadow: '0 0 10px rgba(255, 200, 0, 0.6)',
    marginBottom: '15px',
    marginTop: '10px'
  },
  resultsOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(0, 20, 80, 0.9)',
    border: '2px solid #4466cc',
    borderRadius: '10px',
    padding: '20px',
    width: '80%',
    maxWidth: '600px',
    boxShadow: '0 0 20px rgba(0, 100, 255, 0.7)',
    zIndex: 10
  },
  countdownText: {
    fontSize: '60px',
    fontWeight: 'bold',
    color: '#ffcc33',
    textShadow: '0 0 15px rgba(255, 200, 0, 0.7)',
    textAlign: 'center',
    marginTop: '40px'
  }
};

const QuizScreen = () => {
  const { room } = useConnection();
  const [timeLeft, setTimeLeft] = useState(0);
  const [announcementTime, setAnnouncementTime] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [roundResults, setRoundResults] = useState(null);
  const [eliminationVisible, setEliminationVisible] = useState(false);
  const [eliminatedPlayer, setEliminatedPlayer] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [waitingCountdown, setWaitingCountdown] = useState(10); // Countdown for waiting phase

  // Get game state from store
  const gamePhase = useGameStore(state => state.gamePhase);
  const currentQuestion = useGameStore(state => state.currentQuestion);
  const players = useGameStore(state => state.players);
  const currentPlayerId = useGameStore(state => state.currentPlayerId);
  const currentRound = useGameStore(state => state.currentRound);
  const totalRounds = useGameStore(state => state.totalRounds);
  const timeRemaining = useGameStore(state => state.timeRemaining);
  const scores = useGameStore(state => state.scores);
  const eliminatedPlayers = useGameStore(state => state.eliminatedPlayers);
  const announcementMessage = useGameStore(state => state.announcementMessage);
  const announcementDuration = useGameStore(state => state.announcementDuration);
  
  // Store actions
  const setTimeRemaining = useGameStore(state => state.setTimeRemaining);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const setAnnouncement = useGameStore(state => state.setAnnouncement);
  const setCurrentQuestion = useGameStore(state => state.setCurrentQuestion);
  const submitAnswer = useGameStore(state => state.submitAnswer);

  // Add state for player ready status
  const [playerReadyStatus, setPlayerReadyStatus] = useState({});
  const [allPlayersReady, setAllPlayersReady] = useState(false);

  // Remove the automatic timer that transitions from waiting to quiz
  // This should be driven by the server instead
  useEffect(() => {
    if (gamePhase === "waiting") {
      console.log("In waiting phase - waiting for server to transition to next phase");
    }
  }, [gamePhase]);
  
  // Debug logging to diagnose issues
  useEffect(() => {
    console.log("Current game phase:", gamePhase);
    console.log("Current question:", currentQuestion);
  }, [gamePhase, currentQuestion]);

  // Update local time from server
  useEffect(() => {
    if (timeRemaining !== undefined) {
      setTimeLeft(timeRemaining);
      console.log("Time remaining updated from server:", timeRemaining);
    }
  }, [timeRemaining]);

  // Update local announcement time from store
  useEffect(() => {
    if (announcementDuration !== undefined) {
      setAnnouncementTime(announcementDuration);
      console.log("Announcement duration updated:", announcementDuration);
    }
  }, [announcementDuration]);

  // Listen for all_players_ready message to update countdown
  useEffect(() => {
    if (!room) return;

    const onAllPlayersReady = (data) => {
      console.log("All players ready message received:", data);
      // Could update UI to show players are ready to start
      setWaitingCountdown(10); // Reset countdown when all players are ready
    };

    // Register listener
    room.onMessage("all_players_ready", onAllPlayersReady);

    // Cleanup
    return () => {
      room.removeAllListeners("all_players_ready");
    };
  }, [room]);

  // Listen for ready status updates
  useEffect(() => {
    if (!room) return;

    const onReadyStatusUpdate = (data) => {
      console.log("Ready status update received:", data);
      setPlayerReadyStatus(data);
      
      // Check if all players are ready
      const allReady = Object.values(data).every(ready => ready === true);
      setAllPlayersReady(allReady);
    };

    // Register listener
    room.onMessage("ready_status_update", onReadyStatusUpdate);

    // Cleanup
    return () => {
      room.removeAllListeners("ready_status_update");
    };
  }, [room]);

  // Setup room event listeners
  useEffect(() => {
    if (!room) return;

    // Listen for game announcement
    const onGameAnnouncement = (data) => {
      console.log("Game announcement received:", data);
      // Update the store with announcement data
      setAnnouncement(data.message, data.duration);
      setGamePhase("announcement");
      
      // Server will control timing, so we don't need to start our own countdown here
      setAnnouncementTime(data.duration);
    };

    // Listen for new questions
    const onNewQuestion = (data) => {
      console.log("New question received:", data);
      // Reset local state
      setAnswered(false);
      setSelectedAnswer(null);
      setResultsVisible(false);
      setEliminationVisible(false);
      setGameOver(false);
      
      // Update the current question in the store
      if (data.question && data.options) {
        const questionData = {
          question: data.question,
          options: data.options,
          correctAnswer: data.correctAnswer || 0 // Default to first option if not provided
        };
        setCurrentQuestion(questionData);
        console.log("Updated current question:", questionData);
        
        // Set game phase to quiz
        setGamePhase("quiz");
      }
    };

    // Listen for round results
    const onRoundResults = (data) => {
      console.log("Round results received:", data);
      setRoundResults(data);
      setResultsVisible(true);
      
      // Hide results after 4 seconds
      setTimeout(() => {
        setResultsVisible(false);
      }, 4000);
    };

    // Listen for player elimination
    const onPlayerEliminated = (data) => {
      setEliminatedPlayer(data);
      setEliminationVisible(true);
      
      // Hide elimination message after 4 seconds
      setTimeout(() => {
        setEliminationVisible(false);
      }, 4000);
    };

    // Listen for game over
    const onGameOver = (data) => {
      setWinner(data);
      setGameOver(true);
    };

    // Register event handlers
    room.onMessage("game_announcement", onGameAnnouncement);
    room.onMessage("new_question", onNewQuestion);
    room.onMessage("round_results", onRoundResults);
    room.onMessage("player_eliminated", onPlayerEliminated);
    room.onMessage("game_over", onGameOver);

    // Cleanup
    return () => {
      room.removeAllListeners("game_announcement");
      room.removeAllListeners("new_question");
      room.removeAllListeners("round_results");
      room.removeAllListeners("player_eliminated");
      room.removeAllListeners("game_over");
    };
  }, [room, setGamePhase, setAnnouncement, setCurrentQuestion]);

  // Handle answer selection
  const handleAnswer = (answerIndex) => {
    console.log("handleAnswer called with index:", answerIndex);
    
    if (answered) {
      console.log("Already answered, ignoring click");
      return;
    }
    
    if (!room) {
      console.log("No room connection, cannot submit answer");
      return;
    }
    
    if (gamePhase !== "quiz") {
      console.log("Not in quiz phase, ignoring answer");
      return;
    }
    
    console.log("Submitting answer:", answerIndex);
    
    // Set local UI state
    setSelectedAnswer(answerIndex);
    setAnswered(true);
    
    // Record time taken from question start to answer
    const timeSpent = Math.max(0, 20 - timeLeft);
    
    // Store answer in game store
    submitAnswer(currentPlayerId, answerIndex, timeSpent);
    
    // Send answer to server
    try {
      room.send("submit_answer", { answer: answerIndex });
      console.log("Answer sent to server successfully");
    } catch (error) {
      console.error("Error sending answer to server:", error);
    }
  };

  // Create empty placeholder options for announcement phase
  const placeholderOptions = ["", "", "", ""];

  // Allow player to mark themselves as ready
  const toggleReadyStatus = () => {
    if (!room) return;
    
    // Get current player's ready status and toggle it
    const currentStatus = playerReadyStatus[currentPlayerId] || false;
    const newStatus = !currentStatus;
    
    console.log(`Toggling ready status to: ${newStatus}`);
    
    // Send updated status to server
    room.send("set_ready_status", { ready: newStatus });
  };

  // Render different game phases
  if (gamePhase === "waiting") {
    return (
      <div className="quiz-screen waiting" style={styles.quizScreen}>
        <div style={styles.gameTitle}>WHO WANTS TO BE A MILLIONAIRE</div>
        
        <h2 style={{ fontSize: '24px', textAlign: 'center', marginTop: '10px', color: '#8af' }}>
          Game will start soon
        </h2>
        
        {/* Player ready status display */}
        <div style={{ 
          margin: '20px auto', 
          padding: '15px', 
          backgroundColor: 'rgba(20, 40, 100, 0.7)',
          borderRadius: '8px',
          maxWidth: '80%',
          boxShadow: '0 0 10px rgba(0, 50, 200, 0.5)'
        }}>
          <h3 style={{ textAlign: 'center', color: '#ffcc33', marginBottom: '15px' }}>Players Ready</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(players).map(([playerId, player]) => (
              <div key={playerId} style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '8px',
                backgroundColor: playerId === currentPlayerId ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                borderRadius: '4px'
              }}>
                <span style={{ color: 'white' }}>
                  Player {player.playerNumber} {playerId === currentPlayerId ? '(You)' : ''}
                  {player.isHost ? ' (Host)' : ''}
                </span>
                <span style={{ 
                  color: playerReadyStatus[playerId] ? '#4caf50' : '#ff5a5a',
                  fontWeight: 'bold'
                }}>
                  {playerReadyStatus[playerId] ? 'Ready ✓' : 'Not Ready'}
                </span>
              </div>
            ))}
          </div>
          
          {/* Ready button */}
          <button 
            onClick={toggleReadyStatus}
            style={{
              display: 'block',
              margin: '20px auto 10px',
              padding: '12px 24px',
              backgroundColor: playerReadyStatus[currentPlayerId] ? '#2e7d32' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            {playerReadyStatus[currentPlayerId] ? 'I\'m Ready' : 'Mark as Ready'}
          </button>
          
          {allPlayersReady && (
            <p style={{ 
              textAlign: 'center', 
              color: '#ffcc33', 
              marginTop: '15px',
              fontWeight: 'bold'
            }}>
              All players are ready! Game starting soon...
            </p>
          )}
        </div>
        
        {/* Show sample answer buttons during waiting phase */}
        <div className="answers-container" style={{...styles.answersContainer, marginTop: '50px'}}>
          {["Berlin", "Paris", "London", "Madrid"].map((option, index) => (
            <AnswerButton
              key={index}
              letter={String.fromCharCode(65 + index)} // A, B, C, D
              text={option}
              selected={false}
              disabled={true}
              onClick={() => {}}
            />
          ))}
        </div>
      </div>
    );
  }

  // Announcement phase (just before quiz starts)
  if (gamePhase === "announcement") {
    return (
      <div className="quiz-screen announcement" style={styles.quizScreen}>
        <div style={styles.gameTitle}>WHO WANTS TO BE A MILLIONAIRE</div>
        
        <div className="quiz-header" style={styles.quizHeader}>
          <div className="round-info">
            <span className="round-number" style={{ fontWeight: 'bold', color: '#ffcc33' }}>Get Ready!</span>
            <span className="time-remaining" style={{ marginLeft: '15px', color: '#99ccff' }}>Starting in: {announcementTime}s</span>
          </div>
        </div>
        
        <div className="announcement-container" style={styles.announcementContainer}>
          <h2>{announcementMessage || "The game is about to begin!"}</h2>
        </div>
        
        {/* Show empty answer buttons during announcement */}
        <div className="answers-container" style={styles.answersContainer}>
          {placeholderOptions.map((option, index) => (
            <AnswerButton
              key={index}
              letter={String.fromCharCode(65 + index)} // A, B, C, D
              text={`Option ${String.fromCharCode(65 + index)}`}
              selected={false}
              disabled={true}
              onClick={() => {}}
            />
          ))}
        </div>
      </div>
    );
  }

  if (gamePhase === "quiz") {
    return (
      <div className="quiz-screen active" style={styles.quizScreen}>
        <div style={styles.gameTitle}>WHO WANTS TO BE A MILLIONAIRE</div>
        
        {/* Results overlay */}
        {resultsVisible && roundResults && (
          <div className="results-overlay" style={styles.resultsOverlay}>
            <h2>Round Results</h2>
            <p>Correct Answer: {currentQuestion?.options[roundResults.correctAnswer] || "Unknown"}</p>
            <div className="player-results">
              {Object.entries(roundResults.playerResults || {}).map(([playerId, result]) => {
                const player = players[playerId];
                if (!player) return null;
                return (
                  <div key={playerId} className={`player-result ${result.correct ? 'correct' : 'incorrect'}`}>
                    <span className="player-name">Player {player.playerNumber}</span>
                    <span className="player-answer">
                      {result.answer >= 0 && currentQuestion?.options 
                        ? currentQuestion.options[result.answer] 
                        : "No answer"}
                    </span>
                    <span className="player-points">+{result.points} pts</span>
                  </div>
                );
              })}
            </div>
            <div className="scores">
              <h3>Current Scores</h3>
              {Object.entries(roundResults.scores || {})
                .sort((a, b) => b[1] - a[1]) // Sort by score (highest first)
                .map(([playerId, score]) => {
                  const player = players[playerId];
                  if (!player) return null;
                  return (
                    <div key={playerId} className="player-score">
                      <span className="player-name">Player {player.playerNumber}</span>
                      <span className="score-value">{score} pts</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
        
        {/* Main quiz content */}
        <div className="quiz-header" style={styles.quizHeader}>
          <div className="round-info">
            <span className="round-number" style={{ fontWeight: 'bold', color: '#ffcc33' }}>Round {currentRound || 1}</span>
            <span className="time-remaining" style={{ marginLeft: '15px', color: timeLeft < 5 ? '#ff6666' : '#99ccff' }}>Time: {timeLeft || 20}s</span>
          </div>
        </div>
        
        <div className="question-container" style={styles.questionContainer}>
          <h2 className="question-text">{currentQuestion?.question || "Loading question..."}</h2>
        </div>
        
        <div 
          className="answers-container" 
          style={{
            ...styles.answersContainer,
            pointerEvents: 'auto' // Ensure clicks are allowed
          }}
        >
          {(currentQuestion?.options || ["A", "B", "C", "D"]).map((option, index) => (
            <AnswerButton
              key={index}
              letter={String.fromCharCode(65 + index)} // A, B, C, D
              text={option || `Option ${index + 1}`}
              selected={selectedAnswer === index}
              disabled={answered}
              onClick={() => {
                console.log(`Option ${index} clicked directly`);
                handleAnswer(index);
              }}
            />
          ))}
        </div>
        
        {answered && (
          <div className="waiting-message" style={styles.waitingMessage}>
            Waiting for other players...
          </div>
        )}
      </div>
    );
  }

  if (gamePhase === "elimination") {
    return (
      <div className="quiz-screen elimination" style={styles.quizScreen}>
        {eliminationVisible && eliminatedPlayer && (
          <div className="elimination-message">
            <h2>Player {eliminatedPlayer.playerNumber} has been eliminated!</h2>
            <p>Score: {eliminatedPlayer.score} points</p>
          </div>
        )}
        
        <div className="standings">
          <h3>Current Standings</h3>
          {Object.entries(scores)
            .filter(([playerId]) => !eliminatedPlayers.includes(playerId))
            .sort((a, b) => b[1] - a[1]) // Sort by score (highest first)
            .map(([playerId, score]) => {
              const player = players[playerId];
              return (
                <div key={playerId} className="player-standing">
                  <span className="player-name">Player {player.playerNumber}</span>
                  <span className="score-value">{score} pts</span>
                </div>
              );
            })}
        </div>
        
        <div className="next-round">
          <p>Next round starting soon...</p>
        </div>
      </div>
    );
  }

  if (gamePhase === "finished") {
    return (
      <div className="quiz-screen game-over" style={styles.quizScreen}>
        {winner && !winner.tie && (
          <div className="winner-announcement">
            <h1>Game Over!</h1>
            <h2>Player {winner.winnerNumber} Wins!</h2>
            <p>Score: {winner.winnerScore} points</p>
          </div>
        )}
        
        {winner && winner.tie && (
          <div className="tie-announcement">
            <h1>Game Over!</h1>
            <h2>It's a tie!</h2>
          </div>
        )}
        
        <div className="game-over-message">
          <p>The game will restart soon...</p>
        </div>
      </div>
    );
  }

  // Default fallback (should rarely happen)
  return (
    <div className="quiz-screen" style={styles.quizScreen}>
      <h2 style={{ textAlign: 'center' }}>Getting ready...</h2>
    </div>
  );
};

export default QuizScreen; 