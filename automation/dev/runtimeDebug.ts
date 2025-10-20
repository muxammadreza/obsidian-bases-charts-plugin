import { CMD_FMT } from '../utils/shellUtils';
import {
	LifecycleParticipant,
	RuntimeDebugOrchestrator,
	RuntimeDebugOrchestratorOptions,
	SteeringDirectiveEmitter,
} from './RuntimeDebugOrchestrator';
import { DevWatcherProcess } from './processes/DevWatcherProcess';
import { ObsidianConsoleProcess } from './processes/ObsidianConsoleProcess';
import {
	StreamMultiplexer,
	type StreamEvent,
	DEFAULT_STREAM_PORT,
} from './StreamMultiplexer';
import { RuntimeErrorTracker } from './RuntimeErrorTracker';
import { RuntimeSteeringDirectiveEmitter } from './SteeringDirectiveEmitter';
import readline from 'node:readline';
import { once } from 'events';
import { createDryRunParticipants } from './dryRunParticipants';

const BASES_PREVIEW_FILE = 'bases-preview.base';
const INTERACTIVE_PROMPT = '[runtime-debug]> ';

function buildObsidianFocusUri(): string {
	const vaultName = process.env.OBSIDIAN_RUNTIME_VAULT;
	const encodedFile = encodeURIComponent(BASES_PREVIEW_FILE);
	if (vaultName && vaultName.trim().length > 0) {
		return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodedFile}`;
	}
	return `obsidian://open?file=${encodedFile}`;
}

async function focusBasesPreview(): Promise<void> {
	const uri = buildObsidianFocusUri();
	let command: string[];
	if (process.platform === 'darwin') {
		command = ['open', uri];
	} else if (process.platform === 'win32') {
		command = ['cmd', '/c', 'start', '', uri];
	} else {
		command = ['xdg-open', uri];
	}

	const proc = Bun.spawn(command, { stdout: 'ignore', stderr: 'ignore' });
	const exitCode = await proc.exited;
	if (exitCode !== 0) {
		throw new Error(`Focus command exited with code ${exitCode}`);
	}
}

function logStreamEvent(event: StreamEvent): void {
	if (event.kind === 'log') {
		const isBuild = event.source === 'build';
		const origin = isBuild
			? 'build'
			: `runtime-${String(event.metadata?.origin ?? 'log')}`;
		const prefixColor = isBuild
			? event.level === 'info'
				? CMD_FMT.FgCyan
				: event.level === 'warn'
				? CMD_FMT.FgYellow
				: CMD_FMT.FgRed
			: event.level === 'info'
			? CMD_FMT.FgBlue
			: event.level === 'warn'
			? CMD_FMT.FgYellow
			: CMD_FMT.FgRed;
		const text = `${prefixColor}[${origin}]${CMD_FMT.Reset} ${event.message}`;
		if (event.level === 'error') {
			console.error(text);
		} else if (event.level === 'warn') {
			console.warn(text);
		} else {
			console.log(text);
		}
		return;
	}

	if (event.source === 'build') {
		if (event.status === 'clean') {
			console.log(
				`${CMD_FMT.FgGreen}[build-clean]${CMD_FMT.Reset} Build cycle completed without errors.`,
			);
			return;
		}
		const details: string[] = [];
		if (event.metadata?.exitCode !== undefined) {
			details.push(`exit=${event.metadata.exitCode}`);
		}
		if (event.metadata?.reason) {
			details.push(String(event.metadata.reason));
		}
		const suffix = details.length > 0 ? ` (${details.join(', ')})` : '';
		console.log(`${CMD_FMT.FgMagenta}[build-status]${CMD_FMT.Reset} ${event.status}${suffix}`);
		return;
	}

	const detail = event.metadata?.detail ? ` (${event.metadata.detail})` : '';
	if (event.severity === 'error') {
		console.error(`${CMD_FMT.FgRed}[runtime-status]${CMD_FMT.Reset} ${event.status}${detail}`);
		return;
	}
	if (event.severity === 'warn') {
		console.warn(`${CMD_FMT.FgYellow}[runtime-status]${CMD_FMT.Reset} ${event.status}${detail}`);
		return;
	}
	console.log(`${CMD_FMT.FgMagenta}[runtime-status]${CMD_FMT.Reset} ${event.status}${detail}`);
}

export function createRuntimeDebugOrchestrator(
	multiplexer: StreamMultiplexer,
	steeringEmitter: SteeringDirectiveEmitter,
	participants: LifecycleParticipant[],
): RuntimeDebugOrchestrator {
	const logger: Required<RuntimeDebugOrchestratorOptions['logger']> = {
		info: message => console.log(`${CMD_FMT.FgGreen}[runtime-debug]${CMD_FMT.Reset} ${message}`),
		warn: message => console.warn(`${CMD_FMT.FgYellow}[runtime-debug]${CMD_FMT.Reset} ${message}`),
		error: message => console.error(`${CMD_FMT.FgRed}[runtime-debug]${CMD_FMT.Reset} ${message}`),
	};

	return new RuntimeDebugOrchestrator({
		participants,
		steeringEmitter,
		logger,
		readinessMessage: 'Runtime debugging workflow initialized; live streams active.',
	});
}

function createDefaultParticipants(
	multiplexer: StreamMultiplexer,
	options: { autoLaunch: boolean },
): LifecycleParticipant[] {
	const devWatcher = new DevWatcherProcess({ cwd: process.cwd() });
	devWatcher.on(event => multiplexer.ingestBuildEvent(event));

	const obsidianConsole = new ObsidianConsoleProcess({
		autoLaunch: options.autoLaunch,
		focusCommand: () => focusBasesPreview(),
	});
	obsidianConsole.on(event => multiplexer.ingestRuntimeEvent(event));

	return [devWatcher, obsidianConsole];
}

function renderErrorSummary(snapshot: ReturnType<RuntimeErrorTracker['getSnapshot']>): string {
	const active = snapshot.activeErrors.map(error => `- ${error.id} [${error.source}] ${error.message}`).join('\n');
	const resolved = snapshot.resolvedErrors.slice(0, 5).map(error => `- ${error.id} (resolved) ${error.message}`).join('\n');
	const activeSection = active ? `Active errors:\n${active}` : 'No active errors.';
	const resolvedSection = snapshot.resolvedErrors.length > 0
		? `Recently resolved:\n${resolved}${snapshot.resolvedErrors.length > 5 ? '\n…' : ''}`
		: 'No resolved errors yet.';
	return `${activeSection}\n${resolvedSection}`;
}

function startInteractiveSession(
	errorTracker: RuntimeErrorTracker,
	multiplexer: StreamMultiplexer,
): () => Promise<void> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: INTERACTIVE_PROMPT,
	});

	let closed = false;

	const printHelp = () => {
		console.log(
			`Commands:\n` +
				`  help                Show this message\n` +
				`  list                Display active and recent resolved errors\n` +
				`  resolve <id> [note] Mark error resolved with optional note\n` +
				`  tracker             Print tracker snapshot JSON\n` +
				`  exit|quit           Exit interactive mode`,
		);
	};

	const close = async () => {
		if (closed) {
			return;
		}
		closed = true;
		rl.close();
		await once(rl, 'close').catch(() => undefined);
	};

	const handleResolve = async (args: string[]) => {
		const [id, ...rest] = args;
		if (!id) {
			console.warn(`${CMD_FMT.FgYellow}[runtime-debug]${CMD_FMT.Reset} resolve requires an error id.`);
			return;
		}
		const note = rest.join(' ').trim() || undefined;
		try {
			await errorTracker.markResolved(id, note);
			multiplexer.broadcastTracker(errorTracker.getSnapshot());
			console.log(`${CMD_FMT.FgGreen}[runtime-debug]${CMD_FMT.Reset} Marked ${id} resolved.`);
		} catch (error) {
			console.error(
				`${CMD_FMT.FgRed}[runtime-debug]${CMD_FMT.Reset} ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	};

	rl.on('line', line => {
		void (async () => {
			const trimmed = line.trim();
			if (!trimmed) {
				rl.prompt();
				return;
			}

			const [command, ...args] = trimmed.split(/\s+/);
			switch (command.toLowerCase()) {
				case 'help':
					printHelp();
					break;
				case 'list': {
					const summary = renderErrorSummary(errorTracker.getSnapshot());
					console.log(summary);
					break;
				}
				case 'resolve':
					await handleResolve(args);
					break;
				case 'tracker':
					console.log(JSON.stringify(errorTracker.getSnapshot(), null, 2));
					break;
				case 'exit':
				case 'quit':
					await close();
					return;
				default:
					console.warn(`${CMD_FMT.FgYellow}[runtime-debug]${CMD_FMT.Reset} Unknown command: ${command}`);
			}
			rl.prompt();
		})();
	});

	rl.on('SIGINT', () => {
		void close();
	});

	rl.on('close', () => {
		console.log(`${CMD_FMT.FgMagenta}[runtime-debug]${CMD_FMT.Reset} interactive session ended.`);
	});

	printHelp();
	rl.prompt();

	return close;
}

export async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const dryRun = args.includes('--dry-run');
	const interactive = args.includes('--interactive') || args.includes('-i');
	const autoLaunchObsidian = !args.includes('--no-relaunch');

	const multiplexer = new StreamMultiplexer();
	const steeringEmitter = new RuntimeSteeringDirectiveEmitter();
	const errorTracker = new RuntimeErrorTracker();
	await errorTracker.load();

	multiplexer.setTrackerSnapshotProvider(() => errorTracker.getSnapshot());
	multiplexer.broadcastTracker(errorTracker.getSnapshot());
	multiplexer.setCommandHandler(async (command, { respond }) => {
		if (!command || typeof command !== 'object') {
			respond({ error: 'Invalid command payload' });
			return;
		}
		const { type, id, note } = command as { type?: string; id?: string; note?: string };
		switch (type) {
			case 'resolve': {
				if (!id) {
					respond({ error: 'resolve command requires id' });
					return;
				}
				try {
					await errorTracker.markResolved(id, note);
					const snapshot = errorTracker.getSnapshot();
					multiplexer.broadcastTracker(snapshot);
					respond({ ok: true });
				} catch (error) {
					respond({ error: error instanceof Error ? error.message : String(error) });
				}
				break;
			}
			case 'list': {
				respond({ ok: true, snapshot: errorTracker.getSnapshot() });
				break;
			}
			default:
				respond({ error: `Unknown command type: ${type ?? 'undefined'}` });
		}
	});

	const participants = dryRun
		? createDryRunParticipants({ multiplexer })
		: createDefaultParticipants(multiplexer, { autoLaunch: autoLaunchObsidian });
	const orchestrator = createRuntimeDebugOrchestrator(multiplexer, steeringEmitter, participants);

	const relayEvent = (event: StreamEvent) => {
		logStreamEvent(event);
		errorTracker.recordStreamEvent(event).catch(err => {
			console.error(
				`${CMD_FMT.FgRed}[tracker]${CMD_FMT.Reset} failed to record event: ${err instanceof Error ? err.message : String(err)}`,
			);
		});
	};
	const unsubscribeConsoleRelay = multiplexer.subscribe(relayEvent);

	const unsubscribeTracker = errorTracker.subscribe(event => {
		if (event.type === 'state-changed') {
			multiplexer.broadcastTracker(event.snapshot);
		}
		if (event.type === 'error-created') {
			console.error(
				`${CMD_FMT.FgRed}[tracker]${CMD_FMT.Reset} new error ${event.context.source}:${
					event.context.origin ?? 'unknown'
				} -> ${event.context.message}`,
			);
		}
	});

	const hostname = process.env.RUNTIME_DEBUG_STREAM_HOST ?? undefined;
	const portEnv = process.env.RUNTIME_DEBUG_STREAM_PORT;
	let parsedPort: number | undefined;
	if (portEnv !== undefined) {
		const maybePort = Number.parseInt(portEnv, 10);
		if (Number.isNaN(maybePort)) {
			console.warn(
				`${CMD_FMT.FgYellow}[runtime-debug]${CMD_FMT.Reset} invalid RUNTIME_DEBUG_STREAM_PORT value "${portEnv}"; falling back to default ${DEFAULT_STREAM_PORT}.`,
			);
		} else {
			parsedPort = maybePort;
		}
	}

	const wsHandle = multiplexer.startWebSocketServer({ port: parsedPort, hostname });
	console.log(
		`${CMD_FMT.FgGreen}[runtime-debug]${CMD_FMT.Reset} WebSocket stream ready at ws://${wsHandle.hostname}:${wsHandle.port}`,
	);

	const closeInteractive = interactive ? startInteractiveSession(errorTracker, multiplexer) : undefined;

	const shutdown = async (reason: string, exitCode: number): Promise<never> => {
		try {
			await orchestrator.stop(reason);
		} finally {
			unsubscribeConsoleRelay();
			unsubscribeTracker();
			if (closeInteractive) {
				await closeInteractive();
			}
			await steeringEmitter.shutdown?.(reason);
			multiplexer.setCommandHandler(undefined);
			await multiplexer.shutdown();
			process.exit(exitCode);
		}
	};

	const handleSignal = async (signal: NodeJS.Signals) => {
		await shutdown(`signal:${signal}`, 0);
	};

	try {
		await orchestrator.start();
	} catch (error) {
		console.error(
			`${CMD_FMT.FgRed}[runtime-debug]${CMD_FMT.Reset} failed to start: ${
				error instanceof Error ? error.stack ?? error.message : String(error)
			}`,
		);
		await shutdown('startup-error', 1);
	}

	const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
	for (const signal of signals) {
		process.on(signal, handleSignal);
	}
}

if (import.meta.main) {
	main().catch(error => {
		console.error(
			`${CMD_FMT.FgRed}[runtime-debug]${CMD_FMT.Reset} unexpected failure: ${
				error instanceof Error ? error.stack ?? error.message : String(error)
			}`,
		);
		process.exit(1);
	});
}
