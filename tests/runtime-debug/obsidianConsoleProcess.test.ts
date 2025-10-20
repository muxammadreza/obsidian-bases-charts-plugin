import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
	ObsidianConsoleProcess,
	type ObsidianConsoleEvent,
	type CDPClient,
	type ConsoleAPICalledEvent,
	type LogEntryAddedEvent,
	type RuntimeExceptionThrownEvent,
} from '../../automation/dev/processes/ObsidianConsoleProcess';

class FakeDomain<TEvent extends string, TPayload> {
	public enabled = false;
	private handlers = new Map<TEvent, Set<(payload: TPayload) => void>>();

	async enable(): Promise<void> {
		this.enabled = true;
	}

	on(event: TEvent, handler: (payload: TPayload) => void): void {
		if (!this.handlers.has(event)) {
			this.handlers.set(event, new Set());
		}
		this.handlers.get(event)!.add(handler);
	}

	removeListener(event: TEvent, handler: (payload: TPayload) => void): void {
		this.handlers.get(event)?.delete(handler);
	}

	emit(event: TEvent, payload: TPayload): void {
		for (const handler of this.handlers.get(event) ?? []) {
			handler(payload);
		}
	}
}

class FakeCDPClient implements CDPClient {
	public Runtime = new FakeDomain<'consoleAPICalled' | 'exceptionThrown', ConsoleAPICalledEvent | RuntimeExceptionThrownEvent>();
	public Log = new FakeDomain<'entryAdded', LogEntryAddedEvent>();
	public close = mock(async () => {});
	private disconnectHandlers = new Set<() => void>();

	emitConsole(type: string, args: Array<{ value?: unknown; description?: string }> = []): void {
		this.Runtime.emit('consoleAPICalled', { type, args, timestamp: Date.now() / 1000 });
	}

	emitLog(level: string, text: string): void {
		this.Log.emit('entryAdded', { entry: { level, text, timestamp: Date.now() / 1000 } });
	}

	emitException(message: string): void {
		this.Runtime.emit('exceptionThrown', {
			message,
			exceptionDetails: {
				text: message,
				exception: { description: message },
				stackTrace: {
					callFrames: [
						{
							functionName: 'fn',
							url: 'test.ts',
							lineNumber: 0,
							columnNumber: 0,
						},
					],
				},
				timestamp: Date.now() / 1000,
			},
		} as RuntimeExceptionThrownEvent);
	}

	on(event: 'disconnect', handler: () => void): void {
		if (event === 'disconnect') {
			this.disconnectHandlers.add(handler);
		}
	}

	removeListener(event: 'disconnect', handler: () => void): void {
		if (event === 'disconnect') {
			this.disconnectHandlers.delete(handler);
		}
	}

	emitDisconnect(): void {
		for (const handler of this.disconnectHandlers) {
			handler();
		}
	}
}

class FakeProcess {
	public kill = mock(() => {});
	public exited: Promise<number>;
	private resolveExit!: (code: number) => void;

	constructor() {
		this.exited = new Promise(resolve => {
			this.resolveExit = resolve;
		});
	}

	public exit(code: number): void {
		this.resolveExit(code);
	}
}

describe('ObsidianConsoleProcess', () => {
	let client: FakeCDPClient;
	let events: ObsidianConsoleEvent[];
	let focusCommand: ReturnType<typeof mock>;

	beforeEach(() => {
		client = new FakeCDPClient();
		events = [];
		focusCommand = mock(async () => {});
	});

	function createProcess(options: Partial<ConstructorParameters<typeof ObsidianConsoleProcess>[0]> = {}) {
		const process = new ObsidianConsoleProcess({
			reuseExisting: true,
			connectAttempts: 1,
			connectIntervalMs: 0,
			focusCommand,
			...options,
		});
		process.on(event => events.push(event));
		return process;
	}

	test('attaches using existing devtools session without spawning', async () => {
		const connect = mock(async () => client);
		const spawn = mock(() => new FakeProcess());
		const process = createProcess({ connect, spawn });

		await process.start();

		expect(connect).toHaveBeenCalledTimes(1);
		expect(spawn).not.toHaveBeenCalled();
		expect(focusCommand).toHaveBeenCalledTimes(1);
		const attachedEvent = events.find(
			event => event.type === 'runtime-status' && event.status === 'attached',
		);
		expect(attachedEvent).toBeDefined();
	});

	test('spawns Obsidian when no existing session is available', async () => {
		let callCount = 0;
		const connect = mock(async () => {
			callCount += 1;
			if (callCount === 1) {
				throw new Error('not running');
			}
			return client;
		});
		const spawnedProcess = new FakeProcess();
		const spawn = mock(() => spawnedProcess);
		const process = createProcess({ connect, spawn, reuseExisting: true });

		await process.start();

		expect(spawn).toHaveBeenCalledTimes(1);
		expect(connect).toHaveBeenCalledTimes(2);
		expect(events.some(event => event.type === 'runtime-status' && event.status === 'attached')).toBe(true);
	});

	test('streams console and log events', async () => {
		const process = createProcess({ connect: async () => client, reuseExisting: true });
		await process.start();

		client.emitConsole('log', [{ value: 'Hello' }]);
		client.emitConsole('warning', [{ value: 'Be careful' }]);
		client.emitConsole('error', [{ value: 'Crash' }]);
		client.emitLog('info', 'info update');
		client.emitLog('error', 'runtime failure');

		await Bun.sleep(1);

		expect(
			events.filter(event => event.type === 'runtime-log' && event.level === 'info').length,
		).toBeGreaterThanOrEqual(1);
		expect(
			events.filter(event => event.type === 'runtime-log' && event.level === 'warn').length,
		).toBeGreaterThanOrEqual(1);
		expect(
			events.filter(event => event.type === 'runtime-error' && event.origin === 'console').length,
		).toBe(1);
		expect(
			events.filter(event => event.type === 'runtime-error' && event.origin === 'log').length,
		).toBe(1);
	});

	test('formats non-string console arguments using description/value', async () => {
		const process = createProcess({ connect: async () => client, reuseExisting: true });
		await process.start();

		client.emitConsole('error', [{ description: 'TypeError: boom' }]);
		client.emitConsole('error', [{ value: { message: 'fail' } }]);
		await Bun.sleep(1);

		const errorMessages = events
			.filter(event => event.type === 'runtime-error')
			.map(event => event.message);
		expect(errorMessages.some(message => message.includes('TypeError: boom'))).toBe(true);
		expect(errorMessages.some(message => message.includes('fail'))).toBe(true);
	});

	test('emits runtime-error for exceptionThrown events', async () => {
		const process = createProcess({ connect: async () => client, reuseExisting: true });
		await process.start();

		client.emitException('ReferenceError: x is not defined');
		await Bun.sleep(1);

		const exceptionEvent = events.find(
			event => event.type === 'runtime-error' && event.message.includes('ReferenceError: x is not defined'),
		);
		expect(exceptionEvent).toBeDefined();
	});

	test('reconnects after disconnect', async () => {
		const client2 = new FakeCDPClient();
		let callIndex = 0;
		const connect = mock(async () => {
			callIndex += 1;
			return callIndex === 1 ? client : client2;
		});
		const process = createProcess({ connect, reuseExisting: true });

		await process.start();
		client.emitDisconnect();
		await Bun.sleep(10);

		expect(connect).toHaveBeenCalledTimes(2);
		expect(focusCommand.mock.calls.length).toBeGreaterThanOrEqual(2);
		const attachedEvents = events.filter(
			event => event.type === 'runtime-status' && event.status === 'attached',
		);
		expect(attachedEvents.length).toBeGreaterThanOrEqual(2);
		const reconnectDetail = attachedEvents[attachedEvents.length - 1]?.detail;
		expect(reconnectDetail).toBe('reconnected');
	});

	test('stop closes client and terminates spawned process', async () => {
		const spawnedProcess = new FakeProcess();
		let callCount = 0;
		const connect = mock(async () => {
			callCount += 1;
			if (callCount === 1) {
				throw new Error('not running');
			}
			return client;
		});
		const spawn = mock(() => spawnedProcess);
		const process = createProcess({ connect, spawn, reuseExisting: false });

		await process.start();
		await process.stop('test');

		expect(client.close).toHaveBeenCalledTimes(1);
		expect(spawnedProcess.kill).toHaveBeenCalled();
		const detached = events.filter(
			event => event.type === 'runtime-status' && event.status === 'detached',
		);
		expect(detached.length).toBeGreaterThanOrEqual(1);
	});
});
