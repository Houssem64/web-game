import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useConnection } from '../hooks/useConnection';
import AnswerButton from './UI/AnswerButton';

const QuizScreen = () => {
  const { room } = useConnection();
  const [timeLeft, setTimeLeft] = useState(0);
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
  
  // Store actions
  const setTimeRemaining = useGameStore(state => state.setTimeRemaining);

  // Update local time from server
  useEffect(() => {
    setTimeLeft(timeRemaining);
  }, [timeRemaining]);

  // Setup room event listeners
  useEffect(() => {
    if (!room) return;

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
    room.onMessage("new_question", onNewQuestion);
    room.onMessage("round_results", onRoundResults);
    room.onMessage("player_eliminated", onPlayerEliminated);
    room.onMessage("game_over", onGameOver);

    // Cleanup
    return () => {
      room.removeAllListeners("new_question");
      room.removeAllListeners("round_results");
      room.removeAllListeners("player_eliminated");
      room.removeAllListeners("game_over");
    };
  }, [room]);

  // Handle answer selection
  const handleAnswer = (answerIndex) => {
    if (answered || !room) return;
    
    setSelectedAnswer(answerIndex);
    setAnswered(true);
    
    // Send answer to server
    room.send("submit_answer", { answer: answerIndex });
  };

  // Render different game phases
  if (gamePhase === "waiting") {
    return (
      <div className="quiz-screen waiting">
        <h2>Waiting for the host to start the game...</h2>
        
        {/* Only show start button for the host */}
        {players[currentPlayerId]?.isHost && (
          <button 
            className="start-button"
            onClick={() => room?.send("start_game")}
          >
            Start Game
          </button>
        )}
      </div>
    );
  }

  if (gamePhase === "quiz" && currentQuestion) {
    return (
      <div className="quiz-screen active">
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
        <div className="quiz-header">
          <div className="round-info">
            <span className="round-number">Round {currentRound}</span>
            <span className="time-remaining">Time: {timeLeft}s</span>
          </div>
        </div>
        
        <div className="question-container">
          <h2 className="question-text">{currentQuestion.question}</h2>
        </div>
        
        <div className="answers-container">
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
          <div className="waiting-message">
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

  // Default fallback
  return (
    <div className="quiz-screen loading">
      <p>Loading quiz...</p>
    </div>
  );
};

export default QuizScreen; 