import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tile, GameMode, GridSize } from '../types/game';
import { getStrategy } from '../strategies';
import { SeedablePRNG } from '../utils/prng';
import { ReplaySession } from '../utils/replaySerializer';

export interface ReplayStateFrame {
  tiles: Tile[];
  score: number;
  gameOver: boolean;
  hasWon: boolean;
}

export function useReplayEngine(session: ReplaySession | null) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1); // 0.5, 1, 2, 4

  // Pre-calculate all frames from step 0 to step N
  const frames = useMemo<ReplayStateFrame[]>(() => {
    if (!session) return [];

    const mode = (session.mode as GameMode) ?? GameMode.CLASSIC;
    const gridSize = (session.gridSize as GridSize) ?? 4;
    const strategy = getStrategy(mode);
    const prng = new SeedablePRNG(session.seed);

    let tiles: Tile[] = [];
    tiles = strategy.addRandomTile(tiles, gridSize, prng);
    tiles = strategy.addRandomTile(tiles, gridSize, prng);

    let score = 0;
    let gameOver = false;
    let hasWon = false;

    const resultFrames: ReplayStateFrame[] = [
      {
        tiles,
        score,
        gameOver: strategy.checkGameOver(tiles, gridSize),
        hasWon: strategy.checkWin(tiles),
      },
    ];

    for (const action of session.actions) {
      if (gameOver) break;

      const { tiles: movedTiles, score: addedScore, changed } = strategy.move(
        tiles,
        action.direction,
        gridSize
      );

      if (changed) {
        score += addedScore;
        tiles = strategy.addRandomTile(movedTiles, gridSize, prng);
        hasWon = strategy.checkWin(tiles);
        gameOver = strategy.checkGameOver(tiles, gridSize);
      } else {
        tiles = movedTiles;
      }

      resultFrames.push({
        tiles,
        score,
        gameOver,
        hasWon,
      });
    }

    return resultFrames;
  }, [session]);

  const totalSteps = session ? session.actions.length : 0;

  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [session]);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying || totalSteps === 0) return;

    if (currentStep >= totalSteps) {
      setIsPlaying(false);
      return;
    }

    const intervalMs = Math.max(100, Math.round(500 / speed));
    const timer = setTimeout(() => {
      setCurrentStep((prev) => {
        const next = prev + 1;
        if (next >= totalSteps) {
          setIsPlaying(false);
        }
        return next;
      });
    }, intervalMs);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, totalSteps, speed]);

  const play = useCallback(() => {
    if (totalSteps > 0) {
      if (currentStep >= totalSteps) {
        setCurrentStep(0);
      }
      setIsPlaying(true);
    }
  }, [currentStep, totalSteps]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const stepForward = useCallback(() => {
    pause();
    setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
  }, [totalSteps, pause]);

  const stepBackward = useCallback(() => {
    pause();
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, [pause]);

  const setStep = useCallback(
    (step: number) => {
      pause();
      setCurrentStep(Math.min(totalSteps, Math.max(0, step)));
    },
    [totalSteps, pause]
  );

  const currentFrame = frames[currentStep] ?? frames[0] ?? {
    tiles: [],
    score: 0,
    gameOver: false,
    hasWon: false,
  };

  return {
    currentStep,
    totalSteps,
    isPlaying,
    speed,
    setSpeed,
    play,
    pause,
    togglePlay,
    stepForward,
    stepBackward,
    setStep,
    currentFrame,
  };
}
