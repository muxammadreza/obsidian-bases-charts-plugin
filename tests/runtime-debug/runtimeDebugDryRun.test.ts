import { afterEach, describe, expect, test } from 'bun:test';
import { RuntimeDebugOrchestrator } from '../../automation/dev/RuntimeDebugOrchestrator';
import { StreamMultiplexer } from '../../automation/dev/StreamMultiplexer';
import { createDryRunParticipants } from '../../automation/dev/dryRunParticipants';

class TestSteeringEmitter {
	public startupCount = 0;
	public shutdownCount = 0;

	async emitStartup(): Promise<void> {
		this.startupCount += 1;
	}

	async shutdown(): Promise<void> {
		this.shutdownCount += 1;
	}
}

describe('dry-run participants', () => {
	let multiplexer: StreamMultiplexer;
	let orchestrator: RuntimeDebugOrchestrator;
	const emitter = new TestSteeringEmitter();

	afterEach(async () => {
		await orchestrator?.stop('test-done');
		await multiplexer?.shutdown();
	});

	test('emit build and runtime events without spawning external processes', async () => {
		multiplexer = new StreamMultiplexer({ batchIntervalMs: 50 });
		const participants = createDryRunParticipants({ multiplexer, intervalMs: 50 });
		orchestrator = new RuntimeDebugOrchestrator({
			participants,
			steeringEmitter: emitter,
			logger: {
				info: () => {},
				warn: () => {},
				error: () => {},
			},
			readinessMessage: 'dry-run',
		});

		await orchestrator.start();
		await Bun.sleep(120);

		const events = multiplexer.snapshot();
		expect(events.some(event => event.kind === 'log' && event.source === 'build')).toBe(true);
		expect(events.some(event => event.kind === 'log' && event.source === 'runtime')).toBe(true);
	});
});
