import { describe, it, expect } from 'vitest';
import {
  encodeReplayToString,
  decodeReplayFromString,
  validateReplaySession,
  ReplaySession,
  ReplayAction,
} from './replaySerializer';

describe('replaySerializer module', () => {
  const sampleSession: ReplaySession = {
    seed: 987654321,
    mode: 'CLASSIC',
    gridSize: 4,
    timestamp: 1700000000000,
    score: 2048,
    actions: [
      { direction: 'UP', timestamp: 1700000000100 },
      { direction: 'LEFT', timestamp: 1700000000250 },
      { direction: 'DOWN', timestamp: 1700000000450 },
      { direction: 'RIGHT', timestamp: 1700000000800 },
    ],
  };

  describe('validateReplaySession', () => {
    it('should validate a correct ReplaySession object', () => {
      expect(validateReplaySession(sampleSession)).toBe(true);
    });

    it('should return false for invalid objects or non-objects', () => {
      expect(validateReplaySession(null)).toBe(false);
      expect(validateReplaySession(undefined)).toBe(false);
      expect(validateReplaySession('string')).toBe(false);
      expect(validateReplaySession(123)).toBe(false);
      expect(validateReplaySession({})).toBe(false);
    });

    it('should return false if seed is missing or invalid', () => {
      expect(validateReplaySession({ ...sampleSession, seed: 'abc' as unknown as number })).toBe(false);
      expect(validateReplaySession({ ...sampleSession, seed: NaN })).toBe(false);
    });

    it('should return false if actions is not an array or contains invalid actions', () => {
      expect(validateReplaySession({ ...sampleSession, actions: null as unknown as ReplayAction[] })).toBe(false);
      expect(
        validateReplaySession({
          ...sampleSession,
          actions: [{ direction: 'INVALID' as unknown as ReplayAction['direction'], timestamp: 100 }],
        })
      ).toBe(false);
    });
  });

  describe('encodeReplayToString and decodeReplayFromString', () => {
    it('should encode a session to a non-empty string and decode it losslessly', () => {
      const encoded = encodeReplayToString(sampleSession);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);

      const decoded = decodeReplayFromString(encoded);
      expect(decoded.seed).toBe(sampleSession.seed);
      expect(decoded.mode).toBe(sampleSession.mode);
      expect(decoded.gridSize).toBe(sampleSession.gridSize);
      expect(decoded.score).toBe(sampleSession.score);
      expect(decoded.timestamp).toBe(sampleSession.timestamp);
      expect(decoded.actions.length).toBe(sampleSession.actions.length);

      for (let i = 0; i < sampleSession.actions.length; i++) {
        expect(decoded.actions[i].direction).toBe(sampleSession.actions[i].direction);
        expect(decoded.actions[i].timestamp).toBe(sampleSession.actions[i].timestamp);
      }
    });

    it('should throw when encoding an invalid session', () => {
      expect(() => encodeReplayToString({ seed: 'invalid' } as unknown as ReplaySession)).toThrow();
    });

    it('should throw when decoding an invalid string', () => {
      expect(() => decodeReplayFromString('')).toThrow();
      expect(() => decodeReplayFromString('not_valid_base64_json_!@#$')).toThrow();
    });

    it('should support decoding unencoded JSON string fallback', () => {
      const jsonStr = JSON.stringify(sampleSession);
      const decoded = decodeReplayFromString(jsonStr);
      expect(decoded.seed).toBe(sampleSession.seed);
      expect(decoded.actions.length).toBe(sampleSession.actions.length);
    });
  });
});
