import { EventEmitter } from 'events';
import type { Subprocess } from 'bun';
import { CMD_FMT } from '../../utils/shellUtils';
import type { LifecycleParticipant } from '../RuntimeDebugOrchestrator';

export type DevWatcherEvent =
	| {
			readonly type: 'build-log';
			readonly level: 'info' | 'warn';
			readonly stream: 'stdout' | 'stderr';
			readonly message: string;
			readonly timestamp: number;
	  }
	| {
			readonly type: 'build-error';
			readonly message: string;
			readonly timestamp: number;
	  }
	| {
			readonly type: 'build-status';
			readonly status: 'starting' | 'exited' | 'stopped' | 'clean';
			readonly timestamp: number;
			readonly exitCode?: number;
			readonly reason?: string;
	  };

type SpawnedProcess = Pick<Subprocess<'pipe', 'pipe', 'inherit'>, 'kill' | 'exited' | 'stdout' | 'stderr'>;

type SpawnFunction = (command: string[], options: Parameters<typeof Bun.spawn>[1]) => SpawnedProcess;

export interface DevWatcherProcessOptions {
	cwd?: string;
	env?: Record<string, string>;
	command?: string[];
	errorMatchers?: RegExp[];
	successMatchers?: RegExp[];
	spawn?: SpawnFunction;
	logger?: {
		info(message: string): void;
		warn(message: string): void;
		error(message: string): void;
	};
}

const DEFAULT_ERROR_PATTERNS = [/(^|\s)error(?!s?:\s*0\b)/i, /✘/, /×/, /failed/i];

const DEFAULT_SUCCESS_PATTERNS = [
	/\bready in [0-9.]+\s*(ms|s)/i,
	/\bcompiled successfully\b/i,
	/✓\s+compiled/i,
	/✔\s+compiled/i,
	/\bno issues found\b/i,
	/\bbundle complete\b/i,
];

const DEFAULT_COMMAND = ['bun', 'run', 'dev'];

export class DevWatcherProcess implements LifecycleParticipant {
	public readonly name = 'dev-watcher';

	private readonly command: string[];
	private readonly cwd?: string;
	private readonly env?: Record<string, string>;
	private readonly errorMatchers: RegExp[];
	private readonly successMatchers: RegExp[];
	private readonly spawn: SpawnFunction;
	private readonly logger: Required<NonNullable<DevWatcherProcessOptions['logger']>>;
	private readonly emitter = new EventEmitter();

	private process: SpawnedProcess | null = null;
	private stdoutReaderCancellation?: () => Promise<void>;
	private stderrReaderCancellation?: () => Promise<void>;
	private startPromise: Promise<void> | null = null;
	private hasActiveError = false;

	constructor(options: DevWatcherProcessOptions = {}) {
		this.command = [...(options.command ?? DEFAULT_COMMAND)];
		this.cwd = options.cwd;
		this.env = options.env;
		this.errorMatchers = options.errorMatchers ?? DEFAULT_ERROR_PATTERNS;
		this.successMatchers = options.successMatchers ?? DEFAULT_SUCCESS_PATTERNS;
		this.spawn = options.spawn ?? ((command, spawnOptions) => Bun.spawn(command, spawnOptions));
		this.logger = options.logger ?? {
			info: message => console.log(`${CMD_FMT.FgGreen}[dev-watcher]${CMD_FMT.Reset} ${message}`),
			warn: message => console.warn(`${CMD_FMT.FgYellow}[dev-watcher]${CMD_FMT.Reset} ${message}`),
			error: message => console.error(`${CMD_FMT.FgRed}[dev-watcher]${CMD_FMT.Reset} ${message}`),
		};
	}

	public on(listener: (event: DevWatcherEvent) => void): void {
		this.emitter.on('event', listener);
	}

	public off(listener: (event: DevWatcherEvent) => void): void {
		this.emitter.off('event', listener);
	}

	public emit(event: DevWatcherEvent): void {
		this.emitter.emit('event', event);
	}

	public async start(): Promise<void> {
		if (this.process) {
			throw new Error('DevWatcherProcess.start() called while already running');
		}

		if (this.startPromise) {
			return this.startPromise;
		}

		this.hasActiveError = false;
		this.logger.info(`Starting build watcher via "${this.command.join(' ')}"`);

		const spawnOptions: Parameters<typeof Bun.spawn>[1] = {
			cwd: this.cwd,
			env: this.env,
			stdout: 'pipe',
			stderr: 'pipe',
		};

		this.emit({ type: 'build-status', status: 'starting', timestamp: Date.now() });

		const process = this.spawn(this.command, spawnOptions);
		this.process = process;

		const stdoutAbort = new AbortController();
		const stderrAbort = new AbortController();

		if (process.stdout) {
			const reader = process.stdout.getReader();
			this.stdoutReaderCancellation = () => this.cancelReader(reader, stdoutAbort);
			void this.readStream(reader, 'stdout', stdoutAbort.signal);
		}

		if (process.stderr) {
			const reader = process.stderr.getReader();
			this.stderrReaderCancellation = () => this.cancelReader(reader, stderrAbort);
			void this.readStream(reader, 'stderr', stderrAbort.signal);
		}

		const exitPromise = process.exited
			.then(exitCode => {
				this.emit({
					type: 'build-status',
					status: 'exited',
					exitCode,
					timestamp: Date.now(),
				});
			})
			.catch(error => {
				this.logger.error(`Build watcher exited with error: ${error instanceof Error ? error.message : String(error)}`);
			})
			.finally(() => {
				this.process = null;
				stdoutAbort.abort();
				stderrAbort.abort();
			});

		this.startPromise = Promise.resolve(exitPromise).then(() => {
			this.startPromise = null;
		});

		return Promise.resolve();
	}

	public async stop(reason: string = 'manual-stop'): Promise<void> {
		if (!this.process) {
			return;
		}

		this.logger.info(`Stopping build watcher (${reason}).`);

		try {
			await this.stdoutReaderCancellation?.();
			await this.stderrReaderCancellation?.();
		} catch (error) {
			this.logger.warn(`Failed cancelling stream readers: ${error instanceof Error ? error.message : String(error)}`);
		}

		try {
			this.process.kill();
		} catch (error) {
			this.logger.warn(`Failed to kill build watcher: ${error instanceof Error ? error.message : String(error)}`);
		}

		this.process = null;
		this.emit({
			type: 'build-status',
			status: 'stopped',
			reason,
			timestamp: Date.now(),
		});
	}

	private async cancelReader(reader: ReadableStreamDefaultReader<Uint8Array>, abort: AbortController): Promise<void> {
		abort.abort();
		try {
			await reader.cancel();
		} catch (error) {
			this.logger.warn(`Stream cancellation failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async readStream(reader: ReadableStreamDefaultReader<Uint8Array>, origin: 'stdout' | 'stderr', signal: AbortSignal): Promise<void> {
		const decoder = new TextDecoder();
		let buffer = '';

		try {
			while (true) {
				if (signal.aborted) {
					await reader.cancel();
					return;
				}

				const { value, done } = await reader.read();
				if (done) {
					break;
				}
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split(/\r?\n/);
				buffer = lines.pop() ?? '';

				for (const rawLine of lines) {
					const line = rawLine.replace(/\x1b\[[0-9;]*m/g, '').trimEnd();
					if (line.length === 0) {
						continue;
					}
					this.publishLog(line, origin);
				}
			}

			if (buffer.length > 0) {
				this.publishLog(buffer, origin);
			}
		} catch (error) {
			if (!signal.aborted) {
				this.logger.warn(`Failed reading ${origin}: ${error instanceof Error ? error.message : String(error)}`);
			}
		} finally {
			reader.releaseLock();
		}
	}

	private publishLog(message: string, origin: 'stdout' | 'stderr'): void {
		const timestamp = Date.now();
		const level = origin === 'stderr' ? 'warn' : 'info';
		this.emit({
			type: 'build-log',
			level,
			stream: origin,
			message,
			timestamp,
		});

		if (this.isCompilationError(message)) {
			this.hasActiveError = true;
			this.emit({
				type: 'build-error',
				message,
				timestamp,
			});
		} else if (this.hasActiveError && this.isCleanBuild(message)) {
			this.hasActiveError = false;
			this.emit({
				type: 'build-status',
				status: 'clean',
				timestamp,
			});
		}
	}

	private isCompilationError(line: string): boolean {
		if (/(^|\s)no\s+errors?/i.test(line)) {
			return false;
		}

		return this.errorMatchers.some(pattern => pattern.test(line));
	}

	private isCleanBuild(line: string): boolean {
		return this.successMatchers.some(pattern => pattern.test(line));
	}
}
