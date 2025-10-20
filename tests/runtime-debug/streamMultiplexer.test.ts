import { afterEach, describe, expect, test } from 'bun:test';
import {
	StreamMultiplexer,
	type StreamEvent,
} from '../../automation/dev/StreamMultiplexer';
import type { DevWatcherEvent } from '../../automation/dev/processes/DevWatcherProcess';
import type { ObsidianConsoleEvent } from '../../automation/dev/processes/ObsidianConsoleProcess';

describe('StreamMultiplexer', () => {
	let multiplexer: StreamMultiplexer;

	afterEach(async () => {
		await multiplexer?.shutdown();
	});

	test('normalizes build and runtime events', () => {
		multiplexer = new StreamMultiplexer({ bufferSize: 10 });
		const captured: StreamEvent[] = [];
		multiplexer.subscribe(event => captured.push(event));

		const buildLog: DevWatcherEvent = {
			type: 'build-log',
			message: 'vite ready',
			level: 'info',
			stream: 'stdout',
			timestamp: Date.now(),
		};
		multiplexer.ingestBuildEvent(buildLog);

		const runtimeError: ObsidianConsoleEvent = {
			type: 'runtime-error',
			message: 'ReferenceError',
			origin: 'console',
			timestamp: Date.now(),
		};
		multiplexer.ingestRuntimeEvent(runtimeError);

		expect(captured).toHaveLength(2);
		expect(captured[0]).toMatchObject({ kind: 'log', source: 'build', level: 'info', message: 'vite ready' });
		expect(captured[1]).toMatchObject({ kind: 'log', source: 'runtime', level: 'error', message: 'ReferenceError' });
	});

	test('drops oldest info logs when buffer exceeds limit', () => {
		multiplexer = new StreamMultiplexer({ bufferSize: 3 });

		const addLog = (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
			const event: DevWatcherEvent = {
				type: level === 'error' ? 'build-error' : 'build-log',
				message,
				level: level === 'error' ? 'warn' : level,
				stream: 'stdout',
				timestamp: Date.now(),
			};
			multiplexer.ingestBuildEvent(event);
		};

		addLog('log-1');
		addLog('log-2');
		addLog('warn', 'warn');
		addLog('error', 'error');

		const snapshot = multiplexer.snapshot();
		expect(snapshot).toHaveLength(3);
		expect(snapshot.some(event => event.kind === 'log' && event.message === 'log-1')).toBe(false);
		expect(snapshot.some(event => event.kind === 'log' && event.message === 'error')).toBe(true);
	});

	test('websocket server broadcasts events to connected sockets', async () => {
		multiplexer = new StreamMultiplexer({ bufferSize: 5 });
		multiplexer.startWebSocketServer({ port: 0, hostname: '127.0.0.1' });
		const sockets: Set<any> = (multiplexer as unknown as { sockets: Set<any> }).sockets;
		const fakeSocket = {
			sent: [] as string[],
			closed: false,
			send(payload: string) {
				this.sent.push(payload);
			},
			close() {
				this.closed = true;
			},
		};
		sockets.add(fakeSocket);

	multiplexer.ingestBuildEvent({
		type: 'build-log',
		level: 'info',
		message: 'hello',
		stream: 'stdout',
		timestamp: Date.now(),
	});

	await Bun.sleep(150);
	expect(fakeSocket.sent).toHaveLength(1);
	const parsed = JSON.parse(fakeSocket.sent[0]);
	expect(parsed.type).toBe('event-batch');
	expect(Array.isArray(parsed.events)).toBe(true);
	expect(parsed.events[0]).toMatchObject({ kind: 'log', source: 'build', message: 'hello' });

	sockets.delete(fakeSocket);
	sockets.add(fakeSocket);
	await multiplexer.shutdown();
	expect(fakeSocket.closed).toBe(true);
	});

	test('broadcastTracker delivers tracker snapshots', async () => {
		multiplexer = new StreamMultiplexer({ bufferSize: 5 });
		multiplexer.startWebSocketServer({ port: 0, hostname: '127.0.0.1' });
		const sockets: Set<any> = (multiplexer as unknown as { sockets: Set<any> }).sockets;
		const fakeSocket = {
			sent: [] as string[],
			close() {
				/* noop */
			},
			send(payload: string) {
				this.sent.push(payload);
			},
		};
		sockets.add(fakeSocket);
		const snapshot = {
			activeErrors: [],
			resolvedErrors: [],
			lastCommand: 'test',
		};
		multiplexer.broadcastTracker(snapshot);
		expect(fakeSocket.sent.pop()).toEqual(JSON.stringify({ type: 'tracker', state: snapshot }));
		await multiplexer.shutdown();
	});

	test('command handler receives payload and responds', async () => {
		multiplexer = new StreamMultiplexer({ bufferSize: 5, batchIntervalMs: 50 });
		const responses: unknown[] = [];
		multiplexer.setCommandHandler(async (command, { respond }) => {
			respond({ ok: (command as any).id === '123' });
		});

		const handler = (multiplexer as unknown as { commandHandler: Function }).commandHandler;
		expect(typeof handler).toBe('function');
		await handler({ id: '123' }, { respond: (payload: unknown) => responses.push(payload) });
		expect(responses).toEqual([{ ok: true }]);
		multiplexer.setCommandHandler(undefined);
		await multiplexer.shutdown();
	});
});
