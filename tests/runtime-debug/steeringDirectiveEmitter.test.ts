import { afterEach, describe, expect, mock, test } from 'bun:test';
import { promises as fs } from 'fs';
import { RuntimeSteeringDirectiveEmitter } from '../../automation/dev/SteeringDirectiveEmitter';

const TEMP_STEERING = '.codex/tmp/runtime-debugging.test.md';

describe('RuntimeSteeringDirectiveEmitter', () => {
	afterEach(async () => {
		await fs.rm(TEMP_STEERING, { force: true });
	});

	test('logs steering summary on startup', async () => {
		await fs.mkdir('.codex/tmp', { recursive: true });
		await fs.writeFile(
			TEMP_STEERING,
			`# Title\nLine 1\nLine 2\nLine 3\n`,
			'utf8',
		);

		const log = mock<(message: string) => void>(() => {});
		const emitter = new RuntimeSteeringDirectiveEmitter({
			steeringPath: TEMP_STEERING,
			console: { log, warn: () => {} },
			maxLines: 3,
		});

		await emitter.emitStartup();
		expect(log.mock.calls.length).toBeGreaterThan(0);
		const lastCall = log.mock.calls.at(-1);
		if (!lastCall) {
			throw new Error('Expected steering directive emitter to log a summary line');
		}
		const summary = lastCall[0];
		if (typeof summary !== 'string') {
			throw new Error('Expected steering summary to be logged as a string');
		}
		expect(summary).toContain('Loaded runtime debugging guide');
		expect(summary).toContain('Line 1');
	});
});
