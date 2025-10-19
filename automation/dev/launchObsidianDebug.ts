import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

interface EnvVars {
	DEV_VAULT_PATH?: string;
	OBSIDIAN_EXECUTABLE?: string;
	OBSIDIAN_REMOTE_DEBUG_PORT?: string;
	OBSIDIAN_PROFILE?: string;
}

const BASE_REMOTE_DEBUG_PORT = 9222;
const REMOTE_DEBUG_HOST = '127.0.0.1';
const DEVTOOLS_LIST_PATH = '/json/list';
const DEVTOOLS_WAIT_TIMEOUT_MS = 45000;
const DEVTOOLS_POLL_INTERVAL_MS = 500;
const ENV_FILE = '.env';
const BASES_PREVIEW_FILE = 'bases-preview.base';
const OBSIDIAN_URI_SCHEME = 'obsidian://open?path=';
const OPEN_URI_DELAY_MS = 1500;
interface LaunchConfig {
	command: string;
	args: string[];
	env?: NodeJS.ProcessEnv;
}

interface DevToolsTarget {
	id: string;
	title: string;
	url: string;
	type: string;
	webSocketDebuggerUrl?: string;
}

interface ConsoleAPICalledEvent {
	method: 'Runtime.consoleAPICalled';
	params: {
		type: string;
		args: RemoteObject[];
		stackTrace?: StackTrace;
	};
}

interface LogEntryAddedEvent {
	method: 'Log.entryAdded';
	params: {
		entry: {
			level: string;
			source: string;
			timestamp: number;
			text: string;
		};
	};
}

interface ExceptionThrownEvent {
	method: 'Runtime.exceptionThrown';
	params: {
		exceptionDetails: ExceptionDetails;
	};
}

interface RemoteObject {
	type?: string;
	value?: unknown;
	description?: string;
	unserializableValue?: string;
}

interface StackTrace {
	callFrames?: Array<{
		functionName: string;
		scriptId: string;
		url: string;
		lineNumber: number;
		columnNumber: number;
	}>;
}

interface ExceptionDetails {
	text?: string;
	stackTrace?: StackTrace;
	exception?: {
		description?: string;
		value?: unknown;
	};
}

function readEnvFile(): EnvVars {
	if (!existsSync(ENV_FILE)) {
		return {};
	}

	const raw = readFileSync(ENV_FILE, 'utf8');
	const result: EnvVars = {};

	for (const line of raw.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}

		const equalsIndex = trimmed.indexOf('=');
		if (equalsIndex === -1) {
			continue;
		}

		const key = trimmed.slice(0, equalsIndex).trim();
		const value = trimmed.slice(equalsIndex + 1).trim();

		if (!key) {
			continue;
		}

		Reflect.set(result, key as keyof EnvVars, value);
	}

	return result;
}

function resolveRemoteDebugPort(env: EnvVars): number {
	const portFromEnv = env.OBSIDIAN_REMOTE_DEBUG_PORT ?? process.env.OBSIDIAN_REMOTE_DEBUG_PORT;

	if (portFromEnv) {
		const parsed = Number.parseInt(portFromEnv, 10);
		if (!Number.isNaN(parsed)) {
			return parsed;
		}
	}

	return BASE_REMOTE_DEBUG_PORT;
}

function resolveVaultPath(env: EnvVars): string | undefined {
	return process.env.DEV_VAULT_PATH ?? env.DEV_VAULT_PATH;
}

function resolveExecutable(env: EnvVars): string | undefined {
	return process.env.OBSIDIAN_EXECUTABLE ?? env.OBSIDIAN_EXECUTABLE;
}

function buildLaunchConfig(envVars: EnvVars, targetOpenPath?: string): LaunchConfig {
	const remoteDebugPort = resolveRemoteDebugPort(envVars);
	const executable = resolveExecutable(envVars);
	const profile = process.env.OBSIDIAN_PROFILE ?? envVars.OBSIDIAN_PROFILE;

	switch (process.platform) {
		case 'darwin':
			return buildMacConfig(remoteDebugPort, executable, profile, targetOpenPath);
		case 'win32':
			return buildWindowsConfig(remoteDebugPort, executable, profile, targetOpenPath);
		case 'linux':
			return buildLinuxConfig(remoteDebugPort, executable, profile, targetOpenPath);
		default:
			throw new Error(`Unsupported platform: ${process.platform}`);
	}
}

function buildMacConfig(remoteDebugPort: number, executable?: string, profile?: string, targetOpenPath?: string): LaunchConfig {
	const resolvedExecutable = executable ?? resolveDefaultMacExecutable();
	const args = [`--remote-debugging-port=${remoteDebugPort}`];

	if (profile) {
		args.push('--profile', profile);
	}

	if (targetOpenPath) {
		args.push(targetOpenPath);
	}

	return {
		command: resolvedExecutable,
		args,
	};
}

function buildWindowsConfig(remoteDebugPort: number, executable?: string, profile?: string, targetOpenPath?: string): LaunchConfig {
	const resolvedExecutable = executable ?? resolveDefaultWindowsExecutable();
	const args = [`--remote-debugging-port=${remoteDebugPort}`];

	if (profile) {
		args.push('--profile', profile);
	}

	if (targetOpenPath) {
		args.push(targetOpenPath);
	}

	return {
		command: resolvedExecutable,
		args,
	};
}

function resolveDefaultWindowsExecutable(): string {
	const candidates = [join(process.env.LOCALAPPDATA ?? '', 'Obsidian', 'Obsidian.exe'), 'C:/Program Files/Obsidian/Obsidian.exe'];

	for (const candidate of candidates) {
		if (candidate && existsSync(candidate)) {
			return candidate;
		}
	}

	throw new Error('Unable to locate Obsidian.exe, set OBSIDIAN_EXECUTABLE');
}

function buildLinuxConfig(remoteDebugPort: number, executable?: string, profile?: string, targetOpenPath?: string): LaunchConfig {
	const resolvedExecutable = executable ?? resolveDefaultLinuxExecutable();
	const args = [`--remote-debugging-port=${remoteDebugPort}`];

	if (profile) {
		args.push('--profile', profile);
	}

	if (targetOpenPath) {
		args.push(targetOpenPath);
	}

	return {
		command: resolvedExecutable,
		args,
	};
}

function resolveDefaultLinuxExecutable(): string {
	const home = process.env.HOME ?? '';
	const candidates = [
		join(home, 'Applications', 'Obsidian.AppImage'),
		join(home, 'AppImage', 'Obsidian.AppImage'),
		'/usr/bin/obsidian',
		'/usr/local/bin/obsidian',
	];

	for (const candidate of candidates) {
		if (candidate && existsSync(candidate)) {
			return candidate;
		}
	}

	throw new Error('Unable to locate Obsidian executable, set OBSIDIAN_EXECUTABLE');
}

function resolveDefaultMacExecutable(): string {
	const home = process.env.HOME ?? '';
	const candidates = ['/Applications/Obsidian.app/Contents/MacOS/Obsidian', join(home, 'Applications', 'Obsidian.app', 'Contents', 'MacOS', 'Obsidian')];

	for (const candidate of candidates) {
		if (candidate && existsSync(candidate)) {
			return candidate;
		}
	}

	throw new Error('Unable to locate Obsidian.app binary, set OBSIDIAN_EXECUTABLE');
}

function resolveTargetOpenPath(vaultPath?: string): { targetPath?: string; infoMessage?: string } {
	if (!vaultPath) {
		return {};
	}

	const candidate = join(vaultPath, BASES_PREVIEW_FILE);

	if (existsSync(candidate)) {
		return {
			targetPath: candidate,
			infoMessage: `Opening ${candidate} so the Bases preview loads immediately.`,
		};
	}

	return {
		targetPath: vaultPath,
		infoMessage: `Expected ${candidate} to exist. Falling back to opening the vault root ${vaultPath}.`,
	};
}

function openPathWithScheme(targetPath: string): void {
	const encodedUrl = `${OBSIDIAN_URI_SCHEME}${encodeURIComponent(targetPath)}`;

	let command: string;
	let args: string[];

	switch (process.platform) {
		case 'darwin':
			command = 'open';
			args = [encodedUrl];
			break;
		case 'win32':
			command = 'cmd.exe';
			args = ['/c', 'start', '', encodedUrl];
			break;
		case 'linux':
			command = 'xdg-open';
			args = [encodedUrl];
			break;
		default:
			return;
	}

	const opener = spawn(command, args, {
		detached: true,
		stdio: 'ignore',
	});

	opener.unref();
}

async function waitForDebuggerTarget(port: number): Promise<DevToolsTarget> {
	const deadline = Date.now() + DEVTOOLS_WAIT_TIMEOUT_MS;
	const endpoint = `http://${REMOTE_DEBUG_HOST}:${port}${DEVTOOLS_LIST_PATH}`;
	let lastErrorMessage: string | undefined;
	let lastErrorLoggedAt = 0;

	console.log(`[obsidian-debug] waiting for renderer (port ${port}).`);

	while (Date.now() < deadline) {
		try {
			const response = await fetch(endpoint, { cache: 'no-store' });
			if (response.ok) {
				const targets = (await response.json()) as DevToolsTarget[];
				const target = pickObsidianTarget(targets);
				if (target && target.webSocketDebuggerUrl) {
					return target;
				}
			}
		} catch (error) {
			const message = (error as Error).message;
			const now = Date.now();
			if (message !== lastErrorMessage || now - lastErrorLoggedAt > 5000) {
				console.log(`[obsidian-debug] devtools poll failed: ${message}`);
				lastErrorMessage = message;
				lastErrorLoggedAt = now;
			}
		}

		await delay(DEVTOOLS_POLL_INTERVAL_MS);
	}

	throw new Error(`Timed out waiting for DevTools target on port ${port}.`);
}

function pickObsidianTarget(targets: DevToolsTarget[]): DevToolsTarget | undefined {
	return (
		targets.find(target => target.type === 'page' && target.url.startsWith('app://obsidian')) ??
		targets.find(target => target.type === 'page' && target.title?.toLowerCase().includes('obsidian')) ??
		targets.find(target => target.type === 'page') ??
		targets.at(0)
	);
}

function hasOwn<T extends object>(value: T, key: keyof T): boolean {
	return Object.prototype.hasOwnProperty.call(value, key);
}

function formatRemoteObject(object: RemoteObject): string {
	if (hasOwn(object, 'unserializableValue') && object.unserializableValue) {
		return object.unserializableValue;
	}

	if (hasOwn(object, 'value')) {
		const { value } = object;
		if (typeof value === 'string') {
			return value;
		}

		if (typeof value === 'number' || typeof value === 'boolean') {
			return String(value);
		}

		if (value === null) {
			return 'null';
		}
	}

	if (hasOwn(object, 'description') && object.description) {
		return object.description;
	}

	return '[object]';
}

function formatStackTrace(stack?: StackTrace): string | undefined {
	const frame = stack?.callFrames?.[0];
	if (!frame) {
		return undefined;
	}

	return `${frame.functionName || '(anonymous)'} (${frame.url}:${frame.lineNumber + 1}:${frame.columnNumber + 1})`;
}

function selectEmitter(level: string): (message?: unknown, ...optionalParams: unknown[]) => void {
	switch (level) {
		case 'error':
		case 'assert':
			return console.error.bind(console);
		case 'warning':
		case 'warn':
			return console.warn.bind(console);
		case 'info':
			return console.info.bind(console);
		case 'debug':
		case 'trace':
			return console.debug.bind(console);
		default:
			return console.log.bind(console);
	}
}

function logConsoleEvent(event: ConsoleAPICalledEvent) {
	const message = event.params.args?.map(arg => formatRemoteObject(arg)).join(' ') ?? '';
	const stack = formatStackTrace(event.params.stackTrace);
	const prefix = `[obsidian-console/${event.params.type}]`;
	const emitter = selectEmitter(event.params.type);

	emitter(`${prefix} ${message}`.trimEnd());
	if (stack) {
		emitter(`[obsidian-console/stack] ${stack}`);
	}
}

function logLogEntry(event: LogEntryAddedEvent) {
	const { level, source, text } = event.params.entry;
	const emitter = selectEmitter(level);
	emitter(`[obsidian-log/${level}] (${source}) ${text}`);
}

function logException(event: ExceptionThrownEvent) {
	const { exceptionDetails } = event.params;
	const description = exceptionDetails.exception?.description ?? exceptionDetails.exception?.value ?? exceptionDetails.text ?? 'Unhandled exception';
	const stack = formatStackTrace(exceptionDetails.stackTrace);

	const emitter = console.error.bind(console);
	emitter(`[obsidian-error] ${description}`);
	if (stack) {
		emitter(`[obsidian-error/stack] ${stack}`);
	}
}

async function bridgeConsoleLogs(target: DevToolsTarget): Promise<void> {
	const url = target.webSocketDebuggerUrl;
	if (!url) {
		throw new Error('DevTools target is missing a WebSocket debugger URL.');
	}

	console.log(`[obsidian-debug] connecting to DevTools target ${target.title || target.id}.`);

	let nextCommandId = 0;

	await new Promise<void>((resolve, reject) => {
		const ws = new WebSocket(url);
		let settled = false;

		const finish = (action: () => void) => {
			if (!settled) {
				settled = true;
				action();
			}
		};

		ws.addEventListener('open', () => {
			const send = (method: string, params?: unknown) => {
				ws.send(
					JSON.stringify({
						id: ++nextCommandId,
						method,
						params,
					}),
				);
			};

			send('Runtime.enable');
			send('Log.enable');
			send('Runtime.runIfWaitingForDebugger');
			console.log('[obsidian-debug] debugger-ready');
		});

		ws.addEventListener('message', event => {
			try {
				const payload = JSON.parse(String(event.data)) as ConsoleAPICalledEvent | LogEntryAddedEvent | ExceptionThrownEvent | { method?: string };
				if (!payload?.method) {
					return;
				}

				switch (payload.method) {
					case 'Runtime.consoleAPICalled':
						logConsoleEvent(payload as ConsoleAPICalledEvent);
						break;
					case 'Log.entryAdded':
						logLogEntry(payload as LogEntryAddedEvent);
						break;
					case 'Runtime.exceptionThrown':
						logException(payload as ExceptionThrownEvent);
						break;
					default:
						break;
				}
			} catch (error) {
				console.error(`[obsidian-debug] failed to parse devtools payload: ${(error as Error).message}`);
			}
		});

		ws.addEventListener('error', event => {
			console.error('[obsidian-debug] DevTools WebSocket encountered an error.', event);
			finish(() => reject(new Error('DevTools WebSocket error.')));
		});

		ws.addEventListener('close', () => {
			console.log('[obsidian-debug] DevTools connection closed.');
			finish(() => resolve());
		});

		const shutdown = () => {
			if (ws.readyState === ws.OPEN) {
				ws.close();
			} else {
				finish(() => resolve());
			}
		};

		process.once('SIGINT', () => {
			console.log('[obsidian-debug] received SIGINT, shutting down DevTools bridge.');
			shutdown();
		});

		process.once('SIGTERM', () => {
			console.log('[obsidian-debug] received SIGTERM, shutting down DevTools bridge.');
			shutdown();
		});
	});
}

async function main() {
	try {
		const envVars = readEnvFile();
		const remoteDebugPort = resolveRemoteDebugPort(envVars);
		const vaultPath = resolveVaultPath(envVars);
		const { targetPath, infoMessage } = resolveTargetOpenPath(vaultPath);
		const launchConfig = buildLaunchConfig(envVars, targetPath);
		const child = spawn(launchConfig.command, launchConfig.args, {
			detached: true,
			stdio: 'ignore',
			env: launchConfig.env ?? process.env,
		});

		child.unref();
		child.on('error', error => {
			console.error(`[obsidian-debug] failed to launch Obsidian: ${(error as Error).message}`);
		});

		console.log(`Launched Obsidian (${launchConfig.command}) with args: ${launchConfig.args.join(' ')}`);
		if (infoMessage) {
			console.log(infoMessage);
		}

		if (targetPath) {
			setTimeout(() => {
				openPathWithScheme(targetPath);
				console.log(`Issued obsidian URI open request for ${targetPath}.`);
			}, OPEN_URI_DELAY_MS);
		}

		const target = await waitForDebuggerTarget(remoteDebugPort);
		console.log(`[obsidian-debug] found renderer target: ${(target.title || target.id).trim()} (${target.url}).`);
		await bridgeConsoleLogs(target);
	} catch (error) {
		console.error(`[obsidian-debug] fatal error: ${(error as Error).message}`);
		process.exit(1);
	}
}

void main();
