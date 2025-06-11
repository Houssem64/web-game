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
      console.log("No room connection, reconnecting and then submitting answer");
      // Try to use existing connection rather than failing
      const { room: currentRoom } = useConnection();
      
      if (currentRoom) {
        // If we found a valid room connection, use it
        try {
          currentRoom.send("submit_answer", { answer: answerIndex });
          console.log("Answer sent to server using current room connection");
          
          // Set local UI state
          setSelectedAnswer(answerIndex);
          setAnswered(true);
          
          // Record time taken from question start to answer
          const timeSpent = Math.max(0, 20 - timeLeft);
          
          // Store answer in game store
          submitAnswer(currentPlayerId, answerIndex, timeSpent);
          return;
        } catch (error) {
          console.error("Error using current room connection:", error);
        }
      }
      
      console.log("Could not find valid room connection, answer not submitted");
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

  // Render different game phases - simplified to focus on quiz
  if (gamePhase === "quiz" || gamePhase === "waiting" || gamePhase === "announcement") {
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
          
          {/* Add start game button for host if in waiting phase */}
          {(gamePhase === "waiting" || !currentQuestion) && players[currentPlayerId]?.isHost && (
            <button 
              onClick={() => {
                console.log("Host clicked Start Game button");
                if (room) {
                  room.send("start_game", {});
                }
              }}
              style={{
                padding: '10px 20px',
                fontSize: '18px',
                backgroundColor: '#4466cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: '0 0 10px rgba(50, 100, 255, 0.5)'
              }}
            >
              Start Game
            </button>
          )}
        </div>
        
        {currentQuestion ? (
          <>
            <div className="question-container" style={styles.questionContainer}>
              <h2 className="question-text">
                {currentQuestion.question && currentQuestion.question !== "Question not provided" 
                  ? currentQuestion.question 
                  : "Waiting for question..."}
              </h2>
            </div>
            
            <div 
              className="answers-container" 
              style={{
                ...styles.answersContainer,
                pointerEvents: 'auto' // Ensure clicks are allowed
              }}
            >
              {(currentQuestion.options && currentQuestion.options.length > 0)
                ? currentQuestion.options.map((option, index) => (
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
                  ))
                : ["A", "B", "C", "D"].map((letter, index) => (
                    <AnswerButton
                      key={index}
                      letter={letter}
                      text={`Option ${letter}`}
                      selected={false}
                      disabled={true}
                      onClick={() => {}}
                    />
                  ))
              }
            </div>
          </>
        ) : (
          <>
            {/* Display when no question is available yet */}
            <div style={{ textAlign: 'center', margin: '40px 0', color: '#ffcc33', fontSize: '22px' }}>
              Waiting for the game to start...
            </div>
            
            {/* Show sample answer buttons during waiting */}
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
          </>
        )}
        
        {answered && (
          <div className="waiting-message" style={styles.waitingMessage}>
            Waiting for other players...
          </div>
        )}
      </div>
    );
  }

  // Keep the elimination phase as is
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

  // Keep the finished phase as is
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

  // Default fallback
  return (
    <div className="quiz-screen" style={styles.quizScreen}>
      <div style={styles.gameTitle}>WHO WANTS TO BE A MILLIONAIRE</div>
      <h2 style={{ textAlign: 'center' }}>Getting ready...</h2>
      
      {/* Add start game button for host */}
      {players[currentPlayerId]?.isHost && (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <button 
            onClick={() => {
              console.log("Host clicked Start Game button");
              if (room) {
                room.send("start_game", {});
              }
            }}
            style={{
              padding: '10px 20px',
              fontSize: '18px',
              backgroundColor: '#4466cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(50, 100, 255, 0.5)'
            }}
          >
            Start Game
          </button>
        </div>
      )}
    </div>
  );
}

export default QuizScreen;