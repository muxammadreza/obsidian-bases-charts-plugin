import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { DevWatcherProcess, type DevWatcherEvent } from '../../automation/dev/processes/DevWatcherProcess';

const encoder = new TextEncoder();

class FakeStream {
	private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
	public readonly stream: ReadableStream<Uint8Array>;

	constructor() {
		this.stream = new ReadableStream<Uint8Array>({
			start: controller => {
				this.controller = controller;
			},
		});
	}

	public push(line: string): void {
		this.getController().enqueue(encoder.encode(line));
	}

	public close(): void {
		this.controller?.close();
	}

	private getController(): ReadableStreamDefaultController<Uint8Array> {
		if (!this.controller) {
			throw new Error('Stream controller not initialized');
		}
		return this.controller;
	}
}

class FakeProcess {
	public readonly stdoutStream = new FakeStream();
	public readonly stderrStream = new FakeStream();
	public kill = mock(() => {});
	public readonly exited: Promise<number>;
	private resolveExit!: (code: number) => void;

	constructor() {
		this.exited = new Promise<number>(resolve => {
			this.resolveExit = resolve;
		});
	}

	public stdout = this.stdoutStream.stream;
	public stderr = this.stderrStream.stream;

	public exit(code: number): void {
		this.stdoutStream.close();
		this.stderrStream.close();
		this.resolveExit(code);
	}
}

describe('DevWatcherProcess', () => {
	let process: FakeProcess;
	let events: DevWatcherEvent[];

	beforeEach(() => {
		process = new FakeProcess();
		events = [];
	});

	function createWatcher() {
		const watcher = new DevWatcherProcess({
			spawn: () => process as unknown as any,
		});
		watcher.on(event => events.push(event));
		return watcher;
	}

	test('emits logs and errors from stdout', async () => {
		const watcher = createWatcher();

		await watcher.start();

		process.stdoutStream.push('vite v5.0.0 watching\n');
		process.stdoutStream.push('✘  error  Failed to compile\n');

		await Bun.sleep(10);

		expect(events.some(event => event.type === 'build-status' && event.status === 'starting')).toBe(true);
		expect(events.some(event => event.type === 'build-log' && event.message.includes('vite v5.0.0 watching'))).toBe(true);

		const errorEvent = events.find(event => event.type === 'build-error');
		expect(errorEvent).toBeDefined();
		const now = Date.now();
		expect(Math.abs(now - (errorEvent as any).timestamp)).toBeLessThanOrEqual(5000);
	});

	test('emits stderr as warn logs and detects errors', async () => {
		const watcher = createWatcher();
		await watcher.start();

		process.stderrStream.push('ERROR in src/main.tsx\n');
		await Bun.sleep(5);

		const warnLog = events.find(event => event.type === 'build-log' && event.stream === 'stderr' && event.level === 'warn');
		expect(warnLog).toBeDefined();
		const errorEvent = events.find(event => event.type === 'build-error');
		expect(errorEvent).toBeDefined();
	});

	test('stop kills the process and emits stopped status', async () => {
		const watcher = createWatcher();
		await watcher.start();

		await watcher.stop('test-stop');

		expect(process.kill).toHaveBeenCalled();
		const stopped = events.find(event => event.type === 'build-status' && event.status === 'stopped' && event.reason === 'test-stop');
		expect(stopped).toBeDefined();
	});

	test('process exit emits exited status', async () => {
		const watcher = createWatcher();
		await watcher.start();

		process.exit(0);
		await Bun.sleep(5);

		const exitEvent = events.find(event => event.type === 'build-status' && event.status === 'exited' && event.exitCode === 0);
		expect(exitEvent).toBeDefined();
	});

	test('emits clean status after resolving errors', async () => {
		const watcher = createWatcher();
		await watcher.start();

		process.stdoutStream.push('✘  error  Failed to compile\n');
		await Bun.sleep(2);
		process.stdoutStream.push('✔ compiled successfully in 120ms\n');
		await Bun.sleep(5);

		const cleanEvent = events.find(event => event.type === 'build-status' && event.status === 'clean');
		expect(cleanEvent).toBeDefined();

		const cleanEventCount = events.filter(event => event.type === 'build-status' && event.status === 'clean').length;
		expect(cleanEventCount).toBe(1);

		process.stdoutStream.push('ready in 85ms\n');
		await Bun.sleep(5);
		const secondCleanEventCount = events.filter(event => event.type === 'build-status' && event.status === 'clean').length;
		expect(secondCleanEventCount).toBe(1);
	});

	test('double start throws', async () => {
		const watcher = createWatcher();
		await watcher.start();
		await expect(watcher.start()).rejects.toThrow('DevWatcherProcess.start() called while already running');
	});
});
