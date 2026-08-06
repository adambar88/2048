/**
 * Replay Serializer Module
 * Compact delta serialization and validation for game replays.
 */

export type MoveDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface ReplayAction {
  direction: MoveDirection;
  timestamp: number;
  dt?: number;
}

export interface ReplaySession {
  seed: number;
  mode?: string;
  gridSize?: number;
  actions: ReplayAction[];
  timestamp?: number;
  score?: number;
  version?: number;
}

const DIR_TO_CODE: Record<MoveDirection, number> = {
  UP: 0,
  DOWN: 1,
  LEFT: 2,
  RIGHT: 3,
};

const CODE_TO_DIR: Record<number, MoveDirection> = {
  0: 'UP',
  1: 'DOWN',
  2: 'LEFT',
  3: 'RIGHT',
};

interface BufferGlobal {
  Buffer?: {
    from(data: string, encoding?: string): { toString(encoding: string): string };
  };
}

function toBase64(str: string): string {
  const g = globalThis as unknown as BufferGlobal;
  if (g.Buffer !== undefined) {
    return g.Buffer.from(str, 'utf-8').toString('base64');
  }
  if (typeof btoa === 'function') {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
  }
  throw new Error('No Base64 encoder available');
}

function fromBase64(str: string): string {
  const g = globalThis as unknown as BufferGlobal;
  if (g.Buffer !== undefined) {
    return g.Buffer.from(str, 'base64').toString('utf-8');
  }
  if (typeof atob === 'function') {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  throw new Error('No Base64 decoder available');
}

/**
 * Validates whether an arbitrary object conforms to the ReplaySession interface.
 */
export function validateReplaySession(session: unknown): boolean {
  if (!session || typeof session !== 'object') return false;
  const s = session as Record<string, unknown>;

  if (typeof s.seed !== 'number' || !Number.isFinite(s.seed)) return false;
  if (!Array.isArray(s.actions)) return false;

  const validDirections = new Set<unknown>(['UP', 'DOWN', 'LEFT', 'RIGHT']);
  for (const action of s.actions as unknown[]) {
    if (!action || typeof action !== 'object') return false;
    const act = action as Record<string, unknown>;
    if (!validDirections.has(act.direction)) return false;
    
    const hasValidTimestamp = typeof act.timestamp === 'number' && Number.isFinite(act.timestamp) && act.timestamp >= 0;
    const hasValidDt = typeof act.dt === 'number' && Number.isFinite(act.dt) && act.dt >= 0;
    
    if (!hasValidTimestamp && !hasValidDt) return false;
  }

  if (s.gridSize !== undefined && (typeof s.gridSize !== 'number' || !Number.isFinite(s.gridSize) || s.gridSize <= 0)) {
    return false;
  }
  if (s.mode !== undefined && typeof s.mode !== 'string') {
    return false;
  }
  if (s.score !== undefined && (typeof s.score !== 'number' || !Number.isFinite(s.score) || s.score < 0)) {
    return false;
  }

  return true;
}

/**
 * Encodes a ReplaySession into a compact Base64 string with delta action encoding.
 */
export function encodeReplayToString(session: ReplaySession): string {
  if (!validateReplaySession(session)) {
    throw new Error('Invalid ReplaySession provided for encoding');
  }

  const startTimestamp = session.timestamp ?? (session.actions.length > 0 ? session.actions[0].timestamp : 0);
  
  let prevTimestamp = startTimestamp;
  const deltas: [number, number][] = session.actions.map((action) => {
    const dirCode = DIR_TO_CODE[action.direction] ?? 0;
    const dt = action.dt !== undefined 
      ? action.dt 
      : Math.max(0, action.timestamp - prevTimestamp);
    prevTimestamp = action.timestamp ?? (prevTimestamp + dt);
    return [dirCode, Math.round(dt)];
  });

  const compactPayload = {
    v: session.version ?? 1,
    s: session.seed,
    m: session.mode ?? 'CLASSIC',
    g: session.gridSize ?? 4,
    t: startTimestamp,
    sc: session.score ?? 0,
    a: deltas,
  };

  return toBase64(JSON.stringify(compactPayload));
}

/**
 * Decodes an encoded string (compact Base64 or JSON) back into a full ReplaySession.
 */
export function decodeReplayFromString(encoded: string): ReplaySession {
  if (typeof encoded !== 'string' || !encoded.trim()) {
    throw new Error('Encoded replay must be a non-empty string');
  }

  let parsed: unknown;
  const trimmed = encoded.trim();

  if (trimmed.startsWith('{')) {
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // ignore JSON parse error, try base64 next
    }
  }

  if (!parsed) {
    try {
      const decodedJson = fromBase64(trimmed);
      parsed = JSON.parse(decodedJson);
    } catch {
      throw new Error('Failed to decode replay string: Invalid payload format');
    }
  }

  let session: ReplaySession;

  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).a)) {
    const p = parsed as Record<string, unknown>;
    const startTimestamp = typeof p.t === 'number' ? p.t : 0;
    let currentTimestamp = startTimestamp;
    const rawActions = p.a as unknown[];

    const actions: ReplayAction[] = rawActions.map((item: unknown) => {
      let dir: MoveDirection = 'UP';
      let dt = 0;

      if (Array.isArray(item)) {
        dir = CODE_TO_DIR[item[0] as number] ?? 'UP';
        dt = typeof item[1] === 'number' ? item[1] : 0;
      } else if (typeof item === 'object' && item !== null) {
        const itemObj = item as Record<string, unknown>;
        dir = typeof itemObj.d === 'number' ? (CODE_TO_DIR[itemObj.d] ?? 'UP') : (itemObj.direction as MoveDirection);
        dt = typeof itemObj.dt === 'number' ? itemObj.dt : 0;
      }

      currentTimestamp += dt;
      return {
        direction: dir,
        timestamp: currentTimestamp,
        dt,
      };
    });

    session = {
      seed: p.s as number,
      mode: p.m as string | undefined,
      gridSize: p.g as number | undefined,
      timestamp: startTimestamp,
      score: p.sc as number | undefined,
      actions,
      version: (p.v as number | undefined) ?? 1,
    };
  } else {
    session = parsed as ReplaySession;
  }

  if (!validateReplaySession(session)) {
    throw new Error('Decoded session is not a valid ReplaySession');
  }

  return session;
}
