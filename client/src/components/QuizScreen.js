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
    fontSize: '110%'
  },
  quizHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    padding: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px'
  },
  questionContainer: {
    padding: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    marginBottom: '15px',
    fontSize: '120%',
    fontWeight: 'bold'
  },
  announcementContainer: {
    padding: '20px',
    backgroundColor: 'rgba(0, 40, 100, 0.3)',
    borderRadius: '8px',
    marginBottom: '15px',
    fontSize: '140%',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#ffdd33',
    textShadow: '0 0 10px rgba(255, 255, 100, 0.5)'
  },
  answersContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '10px'
  },
  waitingMessage: {
    textAlign: 'center',
    marginTop: '10px',
    color: '#ffcc00',
    fontWeight: 'bold'
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

  // Update local time from server
  useEffect(() => {
    setTimeLeft(timeRemaining);
  }, [timeRemaining]);

  // Update local announcement time from store
  useEffect(() => {
    setAnnouncementTime(announcementDuration);
  }, [announcementDuration]);

  // Setup room event listeners
  useEffect(() => {
    if (!room) return;

    // Listen for game announcement
    const onGameAnnouncement = (data) => {
      // Update the store with announcement data
      setAnnouncement(data.message, data.duration);
      setGamePhase("announcement");
      
      // Start countdown for announcement
      let timeLeft = data.duration;
      const countdownInterval = setInterval(() => {
        timeLeft--;
        setAnnouncementTime(timeLeft);
        
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);
      
      return () => clearInterval(countdownInterval);
    };

    // Listen for new questions
    const onNewQuestion = (data) => {
      // Reset local state
      setAnswered(false);
      setSelectedAnswer(null);
      setResultsVisible(false);
      setEliminationVisible(false);
      setGameOver(false);
    };

    // Listen for round results
    const onRoundResults = (data) => {
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
  }, [room, setGamePhase, setAnnouncement]);

  // Handle answer selection
  const handleAnswer = (answerIndex) => {
    if (answered || !room || gamePhase !== "quiz") return;
    
    setSelectedAnswer(answerIndex);
    setAnswered(true);
    
    // Send answer to server
    room.send("submit_answer", { answer: answerIndex });
  };

  // Create empty placeholder options for announcement phase
  const placeholderOptions = ["", "", "", ""];

  // Render different game phases
  if (gamePhase === "waiting") {
    return (
      <div className="quiz-screen waiting" style={styles.quizScreen}>
        <h2 style={{ fontSize: '130%', textAlign: 'center', marginTop: '20px' }}>
          Players are getting ready...
        </h2>
        <p style={{ textAlign: 'center', color: '#d1d5db' }}>
          Once everyone is ready, the host can start the game from the menu.
        </p>
      </div>
    );
  }

  // Announcement phase (just before quiz starts)
  if (gamePhase === "announcement") {
    return (
      <div className="quiz-screen announcement" style={styles.quizScreen}>
        <div className="quiz-header" style={styles.quizHeader}>
          <div className="round-info">
            <span className="round-number" style={{ fontWeight: 'bold' }}>Get Ready!</span>
            <span className="time-remaining" style={{ marginLeft: '15px' }}>Starting in: {announcementTime}s</span>
          </div>
        </div>
        
        <div className="announcement-container" style={styles.announcementContainer}>
          <h2>{announcementMessage}</h2>
        </div>
        
        {/* Show empty answer buttons during announcement */}
        <div className="answers-container" style={styles.answersContainer}>
          {placeholderOptions.map((option, index) => (
            <AnswerButton
              key={index}
              letter={String.fromCharCode(65 + index)} // A, B, C, D
              text=""
              selected={false}
              disabled={true}
              onClick={() => {}}
            />
          ))}
        </div>
      </div>
    );
  }

  if (gamePhase === "quiz" && currentQuestion) {
    return (
      <div className="quiz-screen active" style={styles.quizScreen}>
        {/* Results overlay */}
        {resultsVisible && roundResults && (
          <div className="results-overlay">
            <h2>Round Results</h2>
            <p>Correct Answer: {currentQuestion.options[roundResults.correctAnswer]}</p>
            <div className="player-results">
              {Object.entries(roundResults.playerResults).map(([playerId, result]) => {
                const player = players[playerId];
                return (
                  <div key={playerId} className={`player-result ${result.correct ? 'correct' : 'incorrect'}`}>
                    <span className="player-name">Player {player.playerNumber}</span>
                    <span className="player-answer">
                      {result.answer >= 0 
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
              {Object.entries(roundResults.scores)
                .sort((a, b) => b[1] - a[1]) // Sort by score (highest first)
                .map(([playerId, score]) => {
                  const player = players[playerId];
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
            <span className="round-number" style={{ fontWeight: 'bold' }}>Round {currentRound}</span>
            <span className="time-remaining" style={{ marginLeft: '15px', color: timeLeft < 5 ? '#ff6666' : 'white' }}>Time: {timeLeft}s</span>
          </div>
        </div>
        
        <div className="question-container" style={styles.questionContainer}>
          <h2 className="question-text">{currentQuestion.question}</h2>
        </div>
        
        <div className="answers-container" style={styles.answersContainer}>
          {currentQuestion.options.map((option, index) => (
            <AnswerButton
              key={index}
              letter={String.fromCharCode(65 + index)} // A, B, C, D
              text={option}
              selected={selectedAnswer === index}
              disabled={answered}
              onClick={() => handleAnswer(index)}
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
      <div className="quiz-screen elimination">
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
      <div className="quiz-screen game-over">
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