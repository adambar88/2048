import React from 'react';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';

interface ScoreBoardProps {
  score: number;
  bestScore: number;
  scoreDelta?: { value: number; key: number } | null;
  onDeltaEnd?: () => void;
  isChallenge?: boolean;
  challengeTarget?: number;
  challengeTimeLeft?: number;
  challengeLevel?: number;
  totalChallengeLevels?: number;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  score,
  bestScore,
  scoreDelta,
  onDeltaEnd,
  isChallenge = false,
  challengeTarget = 2048,
  challengeTimeLeft = 0,
  challengeLevel = 0,
  totalChallengeLevels = 8,
}) => {
  const displayedScore = useAnimatedValue(score);
  const displayedBest = useAnimatedValue(bestScore);

  const timeWarning = isChallenge && challengeTimeLeft <= 10;

  return (
    <div className={isChallenge ? 'scores-wrapper scores-wrapper--challenge' : 'scores-wrapper'}>
      {isChallenge ? (
        <>
          <div className="score-container">
            <div className="score-label">TARGET</div>
            <div className="score-value">{challengeTarget}</div>
          </div>
          <div className={`score-container${timeWarning ? ' score-container-warn' : ''}`}>
            <div className="score-label">TIME</div>
            <div className="score-value">{challengeTimeLeft}s</div>
          </div>
          <div className="score-container">
            <div className="score-label">LEVEL</div>
            <div className="score-value">
              {challengeLevel + 1}/{totalChallengeLevels}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="score-container">
            <div className="score-label">SCORE</div>
            <div className="score-value">{displayedScore.toLocaleString()}</div>
            {scoreDelta && (
              <span
                key={scoreDelta.key}
                className="score-delta"
                onAnimationEnd={onDeltaEnd}
              >
                +{scoreDelta.value}
              </span>
            )}
          </div>
          <div className="score-container">
            <div className="score-label">BEST</div>
            <div className="score-value">{displayedBest.toLocaleString()}</div>
          </div>
        </>
      )}
    </div>
  );
};
