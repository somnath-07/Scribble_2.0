export interface Env {
  ROOMS: DurableObjectNamespace;
  ASSETS: Fetcher;
}

export interface SocketAttachment {
  playerId: string | null;
  sessionId: string;
}
