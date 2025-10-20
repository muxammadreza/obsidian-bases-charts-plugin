import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import path from 'node:path';
import type { StreamEvent } from './StreamMultiplexer';

const DEFAULT_SERIOUS_WARNING_PATTERNS: ReadonlyArray<RegExp> = [
	/\[\s*violation\s*\]/i,
	/\bviolation\b/i,
	/\bplugin\b[^\n]*\bwarning\b/i,
	/\bwarning\b[^\n]*\bplugin\b/i,
	/\bbases\b[^\n]*\bchart\b[^\n]*\bwarning\b/i,
];

const DEFAULT_RUNTIME_RELEVANCE_PATTERNS: ReadonlyArray<RegExp> = [/\bplugin:bases-charts\b/i, /\bbases[-\s]?charts\b/i];

export type RuntimeErrorTrackerEvent =
	| {
			readonly type: 'state-changed';
			readonly snapshot: RuntimeDebugState;
	  }
	| {
			readonly type: 'error-created';
			readonly context: ErrorContext;
	  }
	| {
			readonly type: 'error-updated';
			readonly context: ErrorContext;
	  };

export interface RuntimeDebugState {
	activeErrors: ErrorContext[];
	resolvedErrors: ErrorContext[];
	lastCommand?: string;
	steeringDigest?: string;
}

export interface ErrorContext {
	readonly id: string;
	readonly source: 'build' | 'runtime';
	readonly firstSeen: number;
	readonly message: string;
	readonly details: Record<string, unknown>;
	readonly origin?: string;
	readonly signature: string;
	readonly history: Array<{ timestamp: number; message: string }>;
	severity: 'error' | 'warning';
	lastSeen: number;
	status: 'active' | 'resolved';
	resolutionNote?: string;
	resolvedAt?: number;
}

export interface RuntimeErrorTrackerOptions {
	statePath?: string;
	clock?: () => number;
	logger?: {
		info(message: string): void;
		warn(message: string): void;
		error(message: string): void;
	};
	seriousWarningPatterns?: ReadonlyArray<RegExp>;
	runtimeRelevancePatterns?: ReadonlyArray<RegExp>;
}

const DEFAULT_STATE_PATH = '.codex/tmp/runtime-debug-state.json';

export class RuntimeErrorTracker {
	private readonly statePath: string;
	private readonly clock: () => number;
	private readonly logger: Required<NonNullable<RuntimeErrorTrackerOptions['logger']>>;
	private readonly emitter = new EventEmitter();
	private readonly seriousWarningPatterns: ReadonlyArray<RegExp>;
	private readonly runtimeRelevancePatterns: ReadonlyArray<RegExp>;
	private state: RuntimeDebugState = { activeErrors: [], resolvedErrors: [] };
	private initialized = false;

	constructor(options: RuntimeErrorTrackerOptions = {}) {
		this.statePath = options.statePath ?? DEFAULT_STATE_PATH;
		this.clock = options.clock ?? Date.now;
		this.logger = options.logger ?? {
			info: message => console.log(`[runtime-error-tracker] ${message}`),
			warn: message => console.warn(`[runtime-error-tracker] WARN ${message}`),
			error: message => console.error(`[runtime-error-tracker] ERROR ${message}`),
		};
		this.seriousWarningPatterns = options.seriousWarningPatterns ?? DEFAULT_SERIOUS_WARNING_PATTERNS;
		this.runtimeRelevancePatterns = options.runtimeRelevancePatterns ?? DEFAULT_RUNTIME_RELEVANCE_PATTERNS;
	}

	public async load(): Promise<void> {
		if (this.initialized) {
			return;
		}

		try {
			const content = await fs.readFile(this.statePath, 'utf8');
			const parsed = this.validateState(JSON.parse(content));
			this.state = parsed;
			const sanitized = JSON.stringify(parsed, null, 2);
			if (sanitized !== content) {
				await this.persist();
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
				this.logger.warn(`Failed to read state file: ${error instanceof Error ? error.message : String(error)}`);
			}
			await this.persist();
		}

		this.initialized = true;
	}

	public subscribe(listener: (event: RuntimeErrorTrackerEvent) => void): () => void {
		this.emitter.on('event', listener);
		return () => this.emitter.off('event', listener);
	}

	public getSnapshot(): RuntimeDebugState {
		return JSON.parse(JSON.stringify(this.state));
	}

	public async recordStreamEvent(event: StreamEvent): Promise<void> {
		if (event.kind !== 'log') {
			return;
		}

		const severity = this.classifySeverity(event);
		if (!severity) {
			return;
		}

		const source = event.source;
		const origin = event.metadata?.origin ? String(event.metadata.origin) : undefined;
		const signature = this.buildSignature(source, origin, event.message);
		const context = this.state.activeErrors.find(error => error.signature === signature);
		const timestamp = this.clock();

		if (context) {
			context.lastSeen = timestamp;
			context.history.push({ timestamp, message: event.message });
			context.severity = severity;
			if (event.metadata) {
				Object.assign(context.details, event.metadata);
			}
			context.details['severity'] = severity;
			await this.persist();
			this.emit({ type: 'error-updated', context: this.cloneContext(context) });
			this.emitState();
			return;
		}

		const newContext: ErrorContext = {
			id: randomUUID(),
			source,
			firstSeen: timestamp,
			lastSeen: timestamp,
			message: event.message,
			details: { ...event.metadata, severity },
			origin,
			signature,
			history: [{ timestamp, message: event.message }],
			severity,
			status: 'active',
		};

		this.state.activeErrors.push(newContext);
		await this.persist();
		this.emit({ type: 'error-created', context: this.cloneContext(newContext) });
		this.emitState();
	}

	public async markResolved(id: string, note?: string): Promise<void> {
		const index = this.state.activeErrors.findIndex(error => error.id === id);
		if (index < 0) {
			throw new Error(`No active error found with id ${id}`);
		}

		const timestamp = this.clock();
		const [context] = this.state.activeErrors.splice(index, 1);
		context.status = 'resolved';
		context.resolutionNote = note;
		context.resolvedAt = timestamp;
		context.lastSeen = timestamp;
		this.state.resolvedErrors.unshift(context);
		await this.persist();
		this.emit({ type: 'error-updated', context: this.cloneContext(context) });
		this.emitState();
	}

	public async setLastCommand(command: string | undefined): Promise<void> {
		this.state.lastCommand = command;
		await this.persist();
		this.emitState();
	}

	public async setSteeringDigest(digest: string | undefined): Promise<void> {
		this.state.steeringDigest = digest;
		await this.persist();
		this.emitState();
	}

	private buildSignature(source: 'build' | 'runtime', origin: string | undefined, message: string): string {
		return `${source}:${origin ?? 'unknown'}:${message}`;
	}

	private classifySeverity(event: Extract<StreamEvent, { kind: 'log' }>): 'error' | 'warning' | null {
		if (event.source === 'runtime' && !this.isRelevantRuntimeEvent(event)) {
			return null;
		}

		if (event.level === 'error') {
			return 'error';
		}

		if (event.level === 'warn' && event.source === 'runtime' && this.isSeriousWarning(event.message)) {
			return 'warning';
		}

		return null;
	}

	private isRelevantRuntimeEvent(event: Extract<StreamEvent, { kind: 'log' }>): boolean {
		if (event.source !== 'runtime') {
			return false;
		}
		const message = event.message ?? '';
		for (const pattern of this.runtimeRelevancePatterns) {
			if (pattern.test(message)) {
				return true;
			}
		}
		return false;
	}

	private isSeriousWarning(message: string | undefined): boolean {
		const text = message ?? '';
		for (const pattern of this.seriousWarningPatterns) {
			if (pattern.test(text)) {
				return true;
			}
		}
		return false;
	}

	private async persist(): Promise<void> {
		try {
			const stateDir = this.getStateDir();
			if (stateDir) {
				await fs.mkdir(stateDir, { recursive: true });
			}
			const tempPath = `${this.statePath}.tmp`;
			await fs.writeFile(tempPath, JSON.stringify(this.state, null, 2), 'utf8');
			try {
				await fs.rename(tempPath, this.statePath);
			} catch (renameError) {
				if ((renameError as NodeJS.ErrnoException).code === 'ENOENT') {
					await fs.writeFile(this.statePath, JSON.stringify(this.state, null, 2), 'utf8');
					await fs.rm(tempPath, { force: true });
				} else {
					throw renameError;
				}
			}
		} catch (error) {
			this.logger.error(`Failed to persist runtime debug state: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private getStateDir(): string | null {
		const dir = path.dirname(this.statePath);
		if (!dir || dir === '.' || dir === '') {
			return null;
		}
		return dir;
	}

	private emit(event: RuntimeErrorTrackerEvent): void {
		this.emitter.emit('event', event);
	}

	private emitState(): void {
		this.emit({ type: 'state-changed', snapshot: this.getSnapshot() });
	}

	private validateState(state: unknown): RuntimeDebugState {
		if (!state || typeof state !== 'object') {
			return { activeErrors: [], resolvedErrors: [] };
		}

		const parsed = state as RuntimeDebugState;
		parsed.activeErrors = Array.isArray(parsed.activeErrors)
			? parsed.activeErrors
					.map(error => this.coerceContext(error))
					.filter((context): context is ErrorContext => Boolean(context && this.isContextRelevant(context)))
			: [];
		parsed.resolvedErrors = Array.isArray(parsed.resolvedErrors)
			? parsed.resolvedErrors
					.map(error => this.coerceContext(error))
					.filter((context): context is ErrorContext => Boolean(context && this.isContextRelevant(context)))
			: [];
		return parsed;
	}

	private coerceContext(context: unknown): ErrorContext | null {
		if (!context || typeof context !== 'object') {
			return null;
		}

		const raw = context as Partial<ErrorContext>;
		if (!raw.id || !raw.source || !raw.message || !raw.firstSeen || !raw.lastSeen) {
			return null;
		}

		const severity: 'error' | 'warning' = raw.severity === 'warning' ? 'warning' : 'error';

		return {
			id: raw.id,
			source: raw.source,
			firstSeen: raw.firstSeen,
			lastSeen: raw.lastSeen,
			message: raw.message,
			details: raw.details ?? {},
			origin: raw.origin,
			signature: raw.signature ?? this.buildSignature(raw.source, raw.origin, raw.message),
			history: Array.isArray(raw.history) ? raw.history : [],
			severity,
			status: raw.status ?? 'active',
			resolutionNote: raw.resolutionNote,
			resolvedAt: raw.resolvedAt,
		};
	}

	private cloneContext(context: ErrorContext): ErrorContext {
		return JSON.parse(JSON.stringify(context));
	}

	private isContextRelevant(context: ErrorContext): boolean {
		if (context.source !== 'runtime') {
			return true;
		}
		for (const pattern of this.runtimeRelevancePatterns) {
			if (pattern.test(context.message)) {
				return true;
			}
		}
		return false;
	}
}
