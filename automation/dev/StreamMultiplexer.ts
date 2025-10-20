import { EventEmitter } from 'events';
import type { Server, ServerWebSocket } from 'bun';
import type { RuntimeDebugState } from './RuntimeErrorTracker';
import type { DevWatcherEvent } from './processes/DevWatcherProcess';
import type { ObsidianConsoleEvent } from './processes/ObsidianConsoleProcess';

export type StreamEvent =
	| {
			readonly kind: 'log';
			readonly source: 'build' | 'runtime';
			readonly level: 'info' | 'warn' | 'error';
			readonly message: string;
			readonly timestamp: number;
			readonly metadata?: Record<string, unknown>;
	  }
	| {
			readonly kind: 'status';
			readonly source: 'build' | 'runtime';
			readonly status: string;
			readonly timestamp: number;
			readonly severity: 'info' | 'warn' | 'error';
			readonly metadata?: Record<string, unknown>;
	  };

export interface StreamMultiplexerOptions {
	bufferSize?: number;
	batchIntervalMs?: number;
}

export interface WebSocketServerHandle {
	readonly port: number;
	readonly hostname: string;
	close(): Promise<void>;
}

const DEFAULT_BUFFER_SIZE = 200;
export const DEFAULT_STREAM_PORT = 48321;
export const DEFAULT_STREAM_HOST = '127.0.0.1';

type SocketData = Record<string, never>;

type CommandHandler = (
	command: unknown,
	context: {
		respond(payload: unknown): void;
	},
) => Promise<void> | void;

export class StreamMultiplexer {
	private readonly emitter = new EventEmitter();
	private readonly buffer: StreamEvent[] = [];
	private readonly bufferSize: number;
	private readonly batchInterval: number;
	private server?: Server<SocketData>;
	private serverPort: number | null = null;
	private serverHostname: string | null = null;
	private readonly sockets = new Set<ServerWebSocket<SocketData>>();
	private pendingBatch: StreamEvent[] = [];
	private batchTimer: ReturnType<typeof setTimeout> | undefined;
	private trackerSnapshotProvider?: () => RuntimeDebugState;
	private commandHandler?: CommandHandler;

	constructor(options: StreamMultiplexerOptions = {}) {
		this.bufferSize = Math.max(1, options.bufferSize ?? DEFAULT_BUFFER_SIZE);
		this.batchInterval = Math.max(10, options.batchIntervalMs ?? 100);
	}

	public ingestBuildEvent(event: DevWatcherEvent): void {
		const normalized = this.normalizeBuildEvent(event);
		if (!normalized) {
			return;
		}
		for (const entry of normalized) {
			this.pushEvent(entry);
		}
	}

	public ingestRuntimeEvent(event: ObsidianConsoleEvent): void {
		const normalized = this.normalizeRuntimeEvent(event);
		if (!normalized) {
			return;
		}
		this.pushEvent(normalized);
	}

	public subscribe(listener: (event: StreamEvent) => void): () => void {
		this.emitter.on('event', listener);
		return () => {
			this.emitter.off('event', listener);
		};
	}

	public snapshot(): readonly StreamEvent[] {
		return [...this.buffer];
	}

	public setTrackerSnapshotProvider(provider: () => RuntimeDebugState): void {
		this.trackerSnapshotProvider = provider;
	}

	public broadcastTracker(state: RuntimeDebugState): void {
		if (this.sockets.size === 0) {
			return;
		}
		this.sendToSockets(JSON.stringify({ type: 'tracker', state }));
	}

	public setCommandHandler(handler: CommandHandler | undefined): void {
		this.commandHandler = handler;
	}

	public startWebSocketServer(options: { port?: number; hostname?: string } = {}): WebSocketServerHandle {
		if (this.server) {
			return {
				port: this.serverPort ?? DEFAULT_STREAM_PORT,
				hostname: this.serverHostname ?? DEFAULT_STREAM_HOST,
				close: () => this.shutdownWebSocketServer(),
			};
		}

		const hostname = options.hostname ?? DEFAULT_STREAM_HOST;
		const port = options.port ?? DEFAULT_STREAM_PORT;
		this.server = Bun.serve<SocketData>({
			hostname,
			port,
			websocket: {
				open: ws => {
					this.sockets.add(ws);
					const payload: Record<string, unknown> = { type: 'snapshot', events: this.snapshot() };
					if (this.trackerSnapshotProvider) {
						payload.tracker = this.trackerSnapshotProvider();
					}
					ws.send(JSON.stringify(payload));
				},
				message: (ws, message) => {
					if (!this.commandHandler) {
						return;
					}

					let parsed: unknown;
					try {
						parsed = typeof message === 'string' ? JSON.parse(message) : JSON.parse(Buffer.from(message).toString('utf8'));
					} catch (error) {
						ws.send(
							JSON.stringify({
								type: 'command-error',
								error: error instanceof Error ? error.message : 'Failed to parse command payload',
							}),
						);
						return;
					}

					const respond = (payload: unknown) => {
						try {
							ws.send(JSON.stringify({ type: 'command-response', payload }));
						} catch (error) {
							ws.close();
						}
					};

					Promise.resolve(this.commandHandler(parsed, { respond })).catch(error => {
						respond({
							type: 'command-error',
							error: error instanceof Error ? error.message : String(error),
						});
					});
				},
				close: ws => {
					this.sockets.delete(ws);
				},
			},
			fetch: () =>
				new Response('Upgrade to WebSocket for runtime debug stream.', {
					status: 426,
					headers: { 'content-type': 'text/plain' },
				}),
		});
		this.serverPort = this.server.port ?? port;
		this.serverHostname = this.server.hostname ?? hostname;

		return {
			port: this.serverPort ?? port,
			hostname: this.serverHostname ?? hostname,
			close: () => this.shutdownWebSocketServer(),
		};
	}

	public async shutdown(): Promise<void> {
		this.emitter.removeAllListeners('event');
		this.flushBatch();
		await this.shutdownWebSocketServer();
	}

	private normalizeBuildEvent(event: DevWatcherEvent): StreamEvent[] | null {
		const timestamp = event.timestamp;
		switch (event.type) {
			case 'build-log':
				return [
					{
						kind: 'log',
						source: 'build',
						level: event.level,
						message: event.message,
						timestamp,
						metadata: { stream: event.stream },
					},
				];
			case 'build-error':
				return [
					{
						kind: 'log',
						source: 'build',
						level: 'error',
						message: event.message,
						timestamp,
					},
				];
			case 'build-status':
				return [
					{
						kind: 'status',
						source: 'build',
						status: event.status,
						timestamp,
						severity: event.status === 'clean' ? 'info' : event.status === 'stopped' ? 'warn' : 'info',
						metadata: this.stripUndefined({ exitCode: event.exitCode, reason: event.reason }),
					},
				];
			default:
				return null;
		}
	}

	private normalizeRuntimeEvent(event: ObsidianConsoleEvent): StreamEvent | null {
		switch (event.type) {
			case 'runtime-log':
				return {
					kind: 'log',
					source: 'runtime',
					level: event.level,
					message: event.message,
					timestamp: event.timestamp,
					metadata: { origin: event.origin },
				};
			case 'runtime-error':
				return {
					kind: 'log',
					source: 'runtime',
					level: 'error',
					message: event.message,
					timestamp: event.timestamp,
					metadata: { origin: event.origin },
				};
			case 'runtime-status':
				return {
					kind: 'status',
					source: 'runtime',
					status: event.status,
					timestamp: event.timestamp,
					severity: event.status === 'error' ? 'error' : event.status === 'detached' ? 'warn' : 'info',
					metadata: this.stripUndefined({ detail: event.detail }),
				};
			default:
				return null;
		}
	}

	private pushEvent(event: StreamEvent): void {
		this.buffer.push(event);
		this.enforceBuffer();
		this.emitter.emit('event', event);
		this.queueEvent(event);
	}

	private enforceBuffer(): void {
		if (this.buffer.length <= this.bufferSize) {
			return;
		}

		const droppableIndex = this.buffer.findIndex(event => event.kind === 'log' && event.level === 'info');
		if (droppableIndex >= 0) {
			this.buffer.splice(droppableIndex, 1);
			return;
		}
		this.buffer.shift();
	}

	private queueEvent(event: StreamEvent): void {
		if (this.sockets.size === 0) {
			return;
		}

		this.pendingBatch.push(event);
		if (this.batchTimer) {
			return;
		}
		this.batchTimer = setTimeout(() => this.flushBatch(), this.batchInterval);
	}

	private flushBatch(): void {
		if (this.pendingBatch.length === 0) {
			if (this.batchTimer) {
				clearTimeout(this.batchTimer);
				this.batchTimer = undefined;
			}
			return;
		}

		const batch = this.pendingBatch.splice(0, this.pendingBatch.length);
		if (this.batchTimer) {
			clearTimeout(this.batchTimer);
			this.batchTimer = undefined;
		}
		this.sendToSockets(JSON.stringify({ type: 'event-batch', events: batch }));
	}

	private async shutdownWebSocketServer(): Promise<void> {
		this.flushBatch();
		for (const socket of [...this.sockets]) {
			try {
				socket.close();
			} catch (_) {
				// ignore closing errors
			}
			this.sockets.delete(socket);
		}

		if (this.server) {
			await this.server.stop();
			this.server = undefined;
		}
		this.serverPort = null;
		this.serverHostname = null;
	}

	private sendToSockets(payload: string): void {
		for (const socket of [...this.sockets]) {
			try {
				socket.send(payload);
			} catch (error) {
				this.sockets.delete(socket);
				try {
					socket.close();
				} catch (_) {
					// ignore
				}
			}
		}
	}

	private stripUndefined(metadata: Record<string, unknown>): Record<string, unknown> | undefined {
		const entries = Object.entries(metadata).filter(([, value]) => value !== undefined);
		return entries.length > 0 ? Object.fromEntries(entries) : undefined;
	}
}
