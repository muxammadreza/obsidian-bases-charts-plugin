import { afterEach, describe, expect, mock, test } from 'bun:test';
import { promises as fs } from 'fs';
import {
	RuntimeErrorTracker,
	type RuntimeDebugState,
} from '../../automation/dev/RuntimeErrorTracker';
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
			message: 'TypeError: undefined is not a function',
			timestamp: clock.now(),
			metadata: { origin: 'console' },
		};
		await tracker.recordStreamEvent(errorEvent);

		const snapshot = tracker.getSnapshot();
		expect(snapshot.activeErrors).toHaveLength(1);
		expect(snapshot.activeErrors[0].message).toContain('TypeError');
		const diskState: RuntimeDebugState = JSON.parse(await fs.readFile(TEMP_STATE, 'utf8'));
		expect(diskState.activeErrors).toHaveLength(1);
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
	});

	test('marks errors resolved and moves to resolved list', async () => {
		const { tracker } = createTracker();
		await tracker.load();
		await tracker.recordStreamEvent({
			kind: 'log',
			source: 'runtime',
			level: 'error',
			message: 'ReferenceError',
			metadata: { origin: 'console' },
			timestamp: clock.now(),
		});

		const id = tracker.getSnapshot().activeErrors[0].id;
		clock.advance(2000);
		await tracker.markResolved(id, 'Fixed missing import');

		const snapshot = tracker.getSnapshot();
		expect(snapshot.activeErrors).toHaveLength(0);
		expect(snapshot.resolvedErrors[0].resolutionNote).toBe('Fixed missing import');
	});

	test('loads state from disk and recovers contexts', async () => {
		const initialState: RuntimeDebugState = {
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
		};
		await fs.mkdir('.codex/tmp', { recursive: true });
		await fs.writeFile(TEMP_STATE, JSON.stringify(initialState), 'utf8');

		const { tracker } = createTracker();
		await tracker.load();

		const snapshot = tracker.getSnapshot();
		expect(snapshot.activeErrors).toHaveLength(1);
		expect(snapshot.activeErrors[0].message).toBe('Example');
	});
});
