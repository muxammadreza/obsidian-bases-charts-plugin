import { afterEach, describe, expect, mock, test } from 'bun:test';
import { promises as fs } from 'fs';
import { RuntimeErrorTracker, type RuntimeDebugState } from '../../automation/dev/RuntimeErrorTracker';
import type { StreamEvent } from '../../automation/dev/StreamMultiplexer';

const TEMP_STATE = '.codex/tmp/runtime-debug-state.test.json';

describe('RuntimeErrorTracker', () => {
	afterEach(async () => {
		await fs.rm(TEMP_STATE, { force: true });
	});

	const clock = (() => {
		let time = 1_700_000_000_000;
		return {
			now: () => time,
			advance: (ms: number) => {
				time += ms;
				return time;
			},
		};
	})();

	function createTracker() {
		const logs: string[] = [];
		return {
			logs,
			tracker: new RuntimeErrorTracker({
				statePath: TEMP_STATE,
				clock: clock.now,
				logger: {
					info: message => logs.push(`info:${message}`),
					warn: message => logs.push(`warn:${message}`),
					error: message => logs.push(`error:${message}`),
				},
			}),
		};
	}

	test('records new errors and persists state', async () => {
		const { tracker } = createTracker();
		await tracker.load();

		const events: StreamEvent[] = [];
		tracker.subscribe(event => {
			if (event.type === 'state-changed') {
				events.push({
					kind: 'status',
					source: 'runtime',
					status: 'state',
					timestamp: Date.now(),
					severity: 'info',
					metadata: { snapshot: event.snapshot },
				});
			}
		});

		const errorEvent: StreamEvent = {
			kind: 'log',
			source: 'runtime',
			level: 'error',
			message: 'TypeError: undefined is not a function\n    at plugin:bases-charts:100:10',
			timestamp: clock.now(),
			metadata: { origin: 'console' },
		};
		await tracker.recordStreamEvent(errorEvent);

		const snapshot = tracker.getSnapshot();
		expect(snapshot.activeErrors).toHaveLength(1);
		expect(snapshot.activeErrors[0].message).toContain('TypeError');
		expect(snapshot.activeErrors[0].severity).toBe('error');
		const diskState: RuntimeDebugState = JSON.parse(await fs.readFile(TEMP_STATE, 'utf8'));
		expect(diskState.activeErrors).toHaveLength(1);
		expect(diskState.activeErrors[0].severity).toBe('error');
	});

	test('deduplicates repeated errors by signature', async () => {
		const { tracker } = createTracker();
		await tracker.load();

		const baseEvent: StreamEvent = {
			kind: 'log',
			source: 'build',
			level: 'error',
			message: 'Build failed: missing semicolon',
			metadata: { stream: 'stderr' },
			timestamp: clock.now(),
		};
		await tracker.recordStreamEvent(baseEvent);
		clock.advance(1000);
		await tracker.recordStreamEvent({ ...baseEvent, timestamp: clock.now() });

		const snapshot = tracker.getSnapshot();
		expect(snapshot.activeErrors).toHaveLength(1);
		expect(snapshot.activeErrors[0].history.length).toBe(2);
		expect(snapshot.activeErrors[0].severity).toBe('error');
	});

	test('marks errors resolved and moves to resolved list', async () => {
		const { tracker } = createTracker();
		await tracker.load();
		await tracker.recordStreamEvent({
			kind: 'log',
			source: 'runtime',
			level: 'error',
			message: 'ReferenceError\n    at plugin:bases-charts:50:9',
			metadata: { origin: 'console' },
			timestamp: clock.now(),
		});

		const id = tracker.getSnapshot().activeErrors[0].id;
		clock.advance(2000);
		await tracker.markResolved(id, 'Fixed missing import');

		const snapshot = tracker.getSnapshot();
		expect(snapshot.activeErrors).toHaveLength(0);
		expect(snapshot.resolvedErrors[0].resolutionNote).toBe('Fixed missing import');
		expect(snapshot.resolvedErrors[0].severity).toBe('error');
	});

	test('loads state from disk and recovers contexts', async () => {
		const initialState = {
			activeErrors: [
				{
					id: '1',
					source: 'build',
					firstSeen: clock.now(),
					lastSeen: clock.now(),
					message: 'Example',
					details: {},
					origin: 'stderr',
					signature: 'build:stderr:Example',
					history: [],
					status: 'active',
				},
			],
			resolvedErrors: [],
		} as unknown as RuntimeDebugState;
		await fs.mkdir('.codex/tmp', { recursive: true });
		await fs.writeFile(TEMP_STATE, JSON.stringify(initialState), 'utf8');

		const { tracker } = createTracker();
		await tracker.load();

		const snapshot = tracker.getSnapshot();
		expect(snapshot.activeErrors).toHaveLength(1);
		expect(snapshot.activeErrors[0].message).toBe('Example');
		expect(snapshot.activeErrors[0].severity).toBe('error');
	});

	test('promotes serious runtime warnings into tracked issues', async () => {
		const { tracker } = createTracker();
		await tracker.load();

		await tracker.recordStreamEvent({
			kind: 'log',
			source: 'runtime',
			level: 'warn',
			message: '[Violation] Bases Charts plugin blocked write\n    at plugin:bases-charts:200:10',
			timestamp: clock.now(),
			metadata: { origin: 'console' },
		});

		const snapshot = tracker.getSnapshot();
		expect(snapshot.activeErrors).toHaveLength(1);
		expect(snapshot.activeErrors[0].severity).toBe('warning');
	});

	test('ignores benign warnings that do not match promotion patterns', async () => {
		const { tracker } = createTracker();
		await tracker.load();

		await tracker.recordStreamEvent({
			kind: 'log',
			source: 'runtime',
			level: 'warn',
			message: 'This is only an informational tip',
			timestamp: clock.now(),
			metadata: { origin: 'console' },
		});

		expect(tracker.getSnapshot().activeErrors).toHaveLength(0);
	});

	test('ignores runtime errors that do not match relevance filters', async () => {
		const { tracker } = createTracker();
		await tracker.load();

		await tracker.recordStreamEvent({
			kind: 'log',
			source: 'runtime',
			level: 'error',
			message: 'TypeError: other plugin failed\n    at plugin:obsidian-style-settings:10:5',
			timestamp: clock.now(),
			metadata: { origin: 'console' },
		});

		expect(tracker.getSnapshot().activeErrors).toHaveLength(0);
	});

	test('escalates severity when an error follows a promoted warning', async () => {
		const { tracker } = createTracker();
		await tracker.load();
		const message = '[Violation] Access denied\n    at plugin:bases-charts:1:1';

		await tracker.recordStreamEvent({
			kind: 'log',
			source: 'runtime',
			level: 'warn',
			message,
			timestamp: clock.now(),
			metadata: { origin: 'console' },
		});
		clock.advance(500);
		await tracker.recordStreamEvent({
			kind: 'log',
			source: 'runtime',
			level: 'error',
			message,
			timestamp: clock.now(),
			metadata: { origin: 'console' },
		});

		const snapshot = tracker.getSnapshot();
		expect(snapshot.activeErrors).toHaveLength(1);
		expect(snapshot.activeErrors[0].severity).toBe('error');
		expect(snapshot.activeErrors[0].history.length).toBe(2);
	});
});
