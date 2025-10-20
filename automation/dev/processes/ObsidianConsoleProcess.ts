/// <reference path="./chrome-remote-interface.d.ts" />
import { EventEmitter } from 'events';
import type { Subprocess } from 'bun';
import { CMD_FMT } from '../../utils/shellUtils';
import type { LifecycleParticipant } from '../RuntimeDebugOrchestrator';

export type ObsidianConsoleEvent =
	| {
		readonly type: 'runtime-log';
		readonly level: 'info' | 'warn';
		readonly message: string;
		readonly timestamp: number;
		readonly origin: 'console' | 'log';
	}
	| {
		readonly type: 'runtime-error';
		readonly message: string;
		readonly timestamp: number;
		readonly origin: 'console' | 'log';
	}
	| {
		readonly type: 'runtime-status';
		readonly status: 'attaching' | 'attached' | 'detached' | 'error';
		readonly timestamp: number;
		readonly detail?: string;
	};

type SpawnedProcess = Pick<Subprocess<'ignore', 'ignore', 'inherit'>, 'kill' | 'exited'>;

type SpawnFunction = (
	command: string[],
	options: Parameters<typeof Bun.spawn>[1],
) => SpawnedProcess;

type ConnectFunction = (options: { host: string; port: number }) => Promise<CDPClient>;

type FocusCommand = () => Promise<void> | void;

export interface CDPDomain<TEvent extends string, TPayload> {
	enable(): Promise<void>;
	on(event: TEvent, handler: (payload: TPayload) => void): void;
	removeListener?(event: TEvent, handler: (payload: TPayload) => void): void;
}

export interface CDPClient {
	Runtime: CDPDomain<'consoleAPICalled' | 'exceptionThrown', ConsoleAPICalledEvent | RuntimeExceptionThrownEvent>;
	Log: CDPDomain<'entryAdded', LogEntryAddedEvent>;
	on?(event: 'disconnect', handler: () => void): void;
	removeListener?(event: 'disconnect', handler: () => void): void;
	close(): Promise<void>;
}

export interface ConsoleAPICalledEvent {
	type: string;
	args?: Array<{ value?: unknown; description?: string }>;
	executionContextId?: number;
	timestamp?: number;
}

export interface RuntimeExceptionThrownEvent {
	message: string;
	exceptionDetails: {
		text?: string;
		exception?: { description?: string; value?: unknown } | null;
		stackTrace?: {
			callFrames?: Array<{
				functionName: string;
				url: string;
				lineNumber: number;
				columnNumber: number;
			}>;
		} | null;
		url?: string;
		lineNumber?: number;
		columnNumber?: number;
		timestamp?: number;
	};
}

export interface LogEntryAddedEvent {
	entry: {
		level?: string;
		text?: string;
		detail?: unknown;
		source?: string;
		timestamp?: number;
	};
}

export interface ObsidianConsoleProcessOptions {
	host?: string;
	port?: number;
	reuseExisting?: boolean;
	launchCommand?: string[];
	spawn?: SpawnFunction;
	connect?: ConnectFunction;
	focusCommand?: FocusCommand;
	connectAttempts?: number;
	connectIntervalMs?: number;
	autoLaunch?: boolean;
	logger?: {
		info(message: string): void;
		warn(message: string): void;
		error(message: string): void;
	};
}

function isRuntimeExceptionEvent(
	payload: ConsoleAPICalledEvent | RuntimeExceptionThrownEvent,
): payload is RuntimeExceptionThrownEvent {
	return (payload as RuntimeExceptionThrownEvent).exceptionDetails !== undefined;
}

function getDefaultLaunchCommand(): string[] {
	if (process.platform === 'darwin') {
		return ['open', '-a', 'Obsidian', '--args', '--devtools', '--remote-debugging-port=39200'];
	}

	const binary = process.platform === 'win32' ? 'Obsidian.exe' : 'obsidian';
	return [binary, '--devtools', '--remote-debugging-port=39200'];
}

export async function defaultConnect(options: { host: string; port: number }): Promise<CDPClient> {
	const { host, port } = options;
	try {
		const criModule = await import('chrome-remote-interface');
		const connect = (criModule.default ?? criModule) as (opts: unknown) => Promise<CDPClient>;
		return await connect({ host, port });
	} catch (error) {
		throw new Error(
			`Unable to connect to Chrome DevTools Protocol at ${host}:${port}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

export class ObsidianConsoleProcess implements LifecycleParticipant {
	public readonly name = 'obsidian-console';

	private readonly host: string;
	private readonly port: number;
	private readonly reuseExisting: boolean;
	private readonly launchCommand: string[];
	private readonly spawn: SpawnFunction;
	private readonly connect: ConnectFunction;
	private readonly focusCommand?: FocusCommand;
	private readonly connectAttempts: number;
	private readonly connectIntervalMs: number;
	private readonly autoLaunch: boolean;
	private readonly logger: Required<NonNullable<ObsidianConsoleProcessOptions['logger']>>;
	private readonly emitter = new EventEmitter();

	private process: SpawnedProcess | null = null;
	private client: CDPClient | null = null;
	private runtimeHandler?: (payload: ConsoleAPICalledEvent | RuntimeExceptionThrownEvent) => void;
	private logHandler?: (payload: LogEntryAddedEvent) => void;
	private disconnectHandler?: () => void;
	private stopping = false;
	private reconnecting = false;
	private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
	private hasAttached = false;

	constructor(options: ObsidianConsoleProcessOptions = {}) {
		this.host = options.host ?? '127.0.0.1';
		this.port = options.port ?? 39200;
		this.reuseExisting = options.reuseExisting ?? true;
		this.launchCommand = [...(options.launchCommand ?? getDefaultLaunchCommand())];
		this.spawn =
			options.spawn ?? ((command, spawnOptions) => Bun.spawn(command, { ...spawnOptions, stdout: 'ignore', stderr: 'ignore' }));
		this.connect = options.connect ?? defaultConnect;
		this.focusCommand = options.focusCommand;
		this.connectAttempts = options.connectAttempts ?? 20;
		this.connectIntervalMs = options.connectIntervalMs ?? 500;
		this.autoLaunch = options.autoLaunch ?? true;
		this.logger =
			options.logger ??
			{
				info: message => console.log(`${CMD_FMT.FgGreen}[obsidian-console]${CMD_FMT.Reset} ${message}`),
				warn: message => console.warn(`${CMD_FMT.FgYellow}[obsidian-console]${CMD_FMT.Reset} ${message}`),
				error: message => console.error(`${CMD_FMT.FgRed}[obsidian-console]${CMD_FMT.Reset} ${message}`),
			};
	}

	public on(listener: (event: ObsidianConsoleEvent) => void): void {
		this.emitter.on('event', listener);
	}

	public off(listener: (event: ObsidianConsoleEvent) => void): void {
		this.emitter.off('event', listener);
	}

	public emit(event: ObsidianConsoleEvent): void {
		this.emitter.emit('event', event);
	}

	public async start(): Promise<void> {
		if (this.client) {
			throw new Error('ObsidianConsoleProcess.start() called while already running');
		}

		this.stopping = false;
		this.reconnecting = false;
		this.emit({ type: 'runtime-status', status: 'attaching', timestamp: Date.now() });
		this.logger.info(`Attaching to Obsidian dev console at ${this.host}:${this.port}`);

		try {
			await this.attachAndInitialize();
			this.emit({ type: 'runtime-status', status: 'attached', timestamp: Date.now() });
		} catch (error) {
			await this.cleanupClient();
			await this.terminateProcess();
			const message = error instanceof Error ? error.message : String(error);
			this.emit({ type: 'runtime-status', status: 'error', timestamp: Date.now(), detail: message });
			this.logger.error(`Failed to attach to Obsidian dev console: ${message}`);
			throw error;
		}
	}

	public async stop(reason: string = 'manual-stop'): Promise<void> {
		this.stopping = true;
		this.reconnecting = false;
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = undefined;
		}
		await this.cleanupClient();
		await this.terminateProcess();
		this.emit({ type: 'runtime-status', status: 'detached', timestamp: Date.now(), detail: reason });
		this.hasAttached = false;
		this.stopping = false;
	}

	private async attach(): Promise<CDPClient> {
		const existing = await this.tryConnectWithRetries(false);
		if (existing) {
			return existing;
		}

		if (!this.autoLaunch) {
			throw new Error(
				'Unable to connect to Obsidian dev console and auto-launch is disabled. Start Obsidian manually or enable auto-launch.',
			);
		}

		await this.launchObsidian();
		const client = await this.tryConnectWithRetries(true);
		if (!client) {
			throw new Error('Unable to connect to Obsidian dev console after launching.');
		}
		return client;
}

	private async attachAndInitialize(): Promise<void> {
		const client = await this.attach();
		this.client = client;
		await this.initializeClient(client);
		await this.focusFile();
		this.hasAttached = true;
	}

	private async launchObsidian(): Promise<void> {
		if (this.process) {
			return;
		}

		this.logger.info(`Launching Obsidian via "${this.launchCommand.join(' ')}"`);
		this.process = this.spawn(this.launchCommand, { stdout: 'ignore', stderr: 'ignore' });
		void this.process.exited.finally(() => {
			this.process = null;
		});
	}

	private async tryConnectWithRetries(throwOnFailure: boolean): Promise<CDPClient | null> {
		let attempt = 0;
		let lastError: unknown;

		while (attempt < this.connectAttempts) {
			attempt += 1;
			try {
				return await this.connect({ host: this.host, port: this.port });
			} catch (error) {
				lastError = error;
				await this.delay(this.connectIntervalMs);
			}
		}

		if (throwOnFailure) {
			throw lastError instanceof Error
				? lastError
				: new Error(`Failed to connect to Obsidian dev console at ${this.host}:${this.port}`);
		}

		return null;
	}

	private async initializeClient(client: CDPClient): Promise<void> {
		await client.Runtime.enable();
		await client.Log.enable();

		this.runtimeHandler = payload => {
			if (isRuntimeExceptionEvent(payload)) {
				this.handleExceptionEvent(payload);
			} else {
				this.handleConsoleEvent(payload);
			}
		};
		this.logHandler = payload => this.handleLogEntry(payload);
		client.Runtime.on('consoleAPICalled', this.runtimeHandler);
		client.Runtime.on('exceptionThrown', this.runtimeHandler);
		client.Log.on('entryAdded', this.logHandler);

		this.disconnectHandler = () => {
			void this.handleDisconnect();
		};
		client.on?.('disconnect', this.disconnectHandler);
	}

	private async focusFile(): Promise<void> {
		if (!this.focusCommand) {
			return;
		}

		try {
			await this.focusCommand();
			this.logger.info('Issued focus command for bases-preview.base');
		} catch (error) {
			this.logger.warn(
				`Failed to focus bases-preview.base: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private handleConsoleEvent(event: ConsoleAPICalledEvent): void {
		const level = this.mapConsoleLevel(event.type);
		const message = this.formatConsoleArguments(event.args ?? []);
		const timestamp = this.normalizeTimestamp(event.timestamp);

		if (level === 'error') {
			this.emit({
				type: 'runtime-error',
				message,
				timestamp,
				origin: 'console',
			});
		} else {
			this.emit({
				type: 'runtime-log',
				level,
				message,
				timestamp,
				origin: 'console',
			});
		}
	}

	private handleExceptionEvent(event: RuntimeExceptionThrownEvent): void {
		const details = event.exceptionDetails;
		const timestamp = this.normalizeTimestamp(details.timestamp);
		const detailText =
			details.text ??
			details.exception?.description ??
			this.stringifyValue(details.exception?.value ?? event.message);
		const stackFrames = details.stackTrace?.callFrames ?? [];
		const prettyStack = stackFrames
			.map(frame => `${frame.functionName || '(anonymous)'} (${frame.url}:${frame.lineNumber + 1}:${frame.columnNumber + 1})`)
			.join('\n');
		const message = prettyStack ? `${detailText}\n${prettyStack}` : detailText;

		this.emit({
			type: 'runtime-error',
			message,
			timestamp,
			origin: 'console',
		});
	}

	private handleLogEntry(event: LogEntryAddedEvent): void {
		const level = this.mapLogLevel(event.entry.level);
		const message = event.entry.text ?? '[no message]';
		const timestamp = this.normalizeTimestamp(event.entry.timestamp);

		if (level === 'error') {
			this.emit({
				type: 'runtime-error',
				message,
				timestamp,
				origin: 'log',
			});
		} else {
			this.emit({
				type: 'runtime-log',
				level,
				message,
				timestamp,
				origin: 'log',
			});
		}
	}

	private async handleDisconnect(): Promise<void> {
		if (this.stopping || this.reconnecting) {
			return;
		}

		this.reconnecting = true;
		await this.cleanupClient();
		this.logger.warn('Lost connection to Obsidian dev console; waiting for manual relaunch.');
		this.scheduleReconnect();
}

	private scheduleReconnect(): void {
		if (this.reconnectTimer || this.stopping) {
			return;
		}

		this.emit({
			type: 'runtime-status',
			status: 'attaching',
			timestamp: Date.now(),
			detail: 'waiting-for-obsidian',
		});

		this.reconnectTimer = setTimeout(async () => {
			this.reconnectTimer = undefined;
			if (this.stopping) {
				return;
			}
			try {
				const client = await this.tryConnectWithRetries(false);
				if (!client) {
					this.scheduleReconnect();
					return;
				}

				this.client = client;
				await this.initializeClient(client);
				await this.focusFile();
				this.hasAttached = true;
				this.reconnecting = false;
				this.emit({
					type: 'runtime-status',
					status: 'attached',
					timestamp: Date.now(),
					detail: 'reconnected',
				});
				this.logger.info('Reconnected to Obsidian dev console.');
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				this.emit({
					type: 'runtime-status',
					status: 'error',
					timestamp: Date.now(),
					detail: `reconnect-failed:${message}`,
				});
				this.logger.error(`Failed to reconnect to Obsidian dev console: ${message}`);
				this.scheduleReconnect();
			}
		}, this.connectIntervalMs);
	}

	private mapConsoleLevel(type: string | undefined): 'info' | 'warn' | 'error' {
		switch (type) {
			case 'error':
			case 'assert':
				return 'error';
			case 'warning':
			case 'warn':
				return 'warn';
			default:
				return 'info';
		}
	}

	private mapLogLevel(level: string | undefined): 'info' | 'warn' | 'error' {
		switch (level) {
			case 'error':
			case 'fatal':
				return 'error';
			case 'warning':
			case 'warn':
				return 'warn';
			default:
				return 'info';
		}
	}

	private formatConsoleArguments(args: Array<{ value?: unknown; description?: string }>): string {
		if (args.length === 0) {
			return '[no arguments]';
		}
		return args
			.map(arg => {
				if (typeof arg.value === 'string') {
					return arg.value;
				}
				if (arg.description) {
					return arg.description;
				}
				if (arg.value !== undefined) {
					return this.stringifyValue(arg.value);
				}
				return '[unknown]';
			})
			.join(' ');
	}

	private stringifyValue(value: unknown): string {
		if (typeof value === 'string') {
			return value;
		}
		try {
			return JSON.stringify(value);
		} catch (error) {
			return String(value);
		}
	}

	private normalizeTimestamp(timestamp: number | undefined): number {
		if (!timestamp) {
			return Date.now();
		}
		// CDP timestamps are seconds since epoch.
		return timestamp > 1_000_000_000_000 ? timestamp : Math.floor(timestamp * 1000);
	}

	private async cleanupClient(): Promise<void> {
		if (!this.client) {
			return;
		}

		if (this.runtimeHandler) {
			if (typeof this.client.Runtime.removeListener === 'function') {
				this.client.Runtime.removeListener('consoleAPICalled', this.runtimeHandler);
				this.client.Runtime.removeListener?.('exceptionThrown', this.runtimeHandler);
			}
		}

		if (this.logHandler) {
			if (typeof this.client.Log.removeListener === 'function') {
				this.client.Log.removeListener('entryAdded', this.logHandler);
			}
		}

		if (this.disconnectHandler && typeof this.client.removeListener === 'function') {
			this.client.removeListener('disconnect', this.disconnectHandler);
		}

		try {
			await this.client.close();
		} catch (error) {
			this.logger.warn(
				`Failed to close Obsidian console client: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}

		this.client = null;
		this.runtimeHandler = undefined;
		this.logHandler = undefined;
		this.disconnectHandler = undefined;
	}

	private async terminateProcess(): Promise<void> {
		if (!this.process) {
			return;
		}

		try {
			this.process.kill();
		} catch (error) {
			this.logger.warn(`Failed to terminate Obsidian process: ${
				error instanceof Error ? error.message : String(error)
			}`);
		}

		this.process = null;
	}

	private async delay(ms: number): Promise<void> {
		if (ms <= 0) {
			return;
		}
		await new Promise(resolve => setTimeout(resolve, ms));
	}
}
