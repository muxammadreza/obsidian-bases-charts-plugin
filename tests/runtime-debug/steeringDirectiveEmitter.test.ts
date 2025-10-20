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

		const log = mock(() => {});
		const emitter = new RuntimeSteeringDirectiveEmitter({
			steeringPath: TEMP_STEERING,
			console: { log, warn: () => {} },
			maxLines: 3,
		});

		await emitter.emitStartup();
		expect(log).toHaveBeenCalledTimes(1);
		const summary = log.mock.calls[0][0] as string;
		expect(summary).toContain('Loaded runtime debugging guide');
		expect(summary).toContain('Line 1');
	});
});
