import { describe, expect, test } from 'bun:test';
import { RuntimeDebugOrchestrator } from '../../automation/dev/RuntimeDebugOrchestrator';
import type { LifecycleParticipant, SteeringDirectiveEmitter } from '../../automation/dev/RuntimeDebugOrchestrator';

class TestParticipant implements LifecycleParticipant {
	public startCount = 0;
	public stopCount = 0;
	public lastStopReason: string | undefined;

	public constructor(
		public readonly name: string,
		private readonly callOrder: string[] = [],
		private readonly onStart?: () => Promise<void> | void,
		private readonly onStop?: () => Promise<void> | void,
	) {}

	async start(): Promise<void> {
		this.startCount += 1;
		this.callOrder.push(`start:${this.name}`);
		await this.onStart?.();
	}

	async stop(reason?: string): Promise<void> {
		this.stopCount += 1;
		this.lastStopReason = reason;
		this.callOrder.push(`stop:${this.name}`);
		await this.onStop?.();
	}
}

class TestSteeringEmitter implements SteeringDirectiveEmitter {
	public startupCount = 0;
	public shutdownCount = 0;
	public lastShutdownReason: string | undefined;

	public constructor(private readonly callOrder: string[] = []) {}

	async emitStartup(): Promise<void> {
		this.startupCount += 1;
		this.callOrder.push('steering:startup');
	}

	async shutdown(reason?: string): Promise<void> {
		this.shutdownCount += 1;
		this.lastShutdownReason = reason;
		this.callOrder.push('steering:shutdown');
	}
}

const silentLogger = {
	info: () => {},
	warn: () => {},
	error: () => {},
};

describe('RuntimeDebugOrchestrator', () => {
	test('starts participants and emits steering directives', async () => {
		const callOrder: string[] = [];
		const participants = [new TestParticipant('dev', callOrder), new TestParticipant('obsidian', callOrder)];
		const emitter = new TestSteeringEmitter(callOrder);
		const orchestrator = new RuntimeDebugOrchestrator({
			participants,
			steeringEmitter: emitter,
			logger: silentLogger,
			readinessMessage: 'ready',
		});

		await orchestrator.start();

		expect(participants.every(p => p.startCount === 1)).toBe(true);
		expect(emitter.startupCount).toBe(1);
		expect(callOrder).toContain('steering:startup');
		const startPositions = callOrder.map((token, index) => ({ token, index })).filter(entry => entry.token.startsWith('start:'));
		const steeringIndex = callOrder.indexOf('steering:startup');
		for (const { index } of startPositions) {
			expect(index).toBeLessThan(steeringIndex);
		}

		await orchestrator.stop('test');

		expect(participants.every(p => p.stopCount === 1)).toBe(true);
		expect(emitter.shutdownCount).toBe(1);
		expect(emitter.lastShutdownReason).toBe('test');
	});

	test('stops participants in reverse order', async () => {
		const callOrder: string[] = [];
		const first = new TestParticipant('first', callOrder);
		const second = new TestParticipant('second', callOrder);
		const orchestrator = new RuntimeDebugOrchestrator({
			participants: [first, second],
			steeringEmitter: new TestSteeringEmitter(callOrder),
			logger: silentLogger,
		});

		await orchestrator.start();
		await orchestrator.stop('reverse-test');

		const firstStopIndex = callOrder.indexOf('stop:first');
		const secondStopIndex = callOrder.indexOf('stop:second');
		expect(secondStopIndex).toBeLessThan(firstStopIndex);
	});

	test('rejects double start', async () => {
		const orchestrator = new RuntimeDebugOrchestrator({
			participants: [new TestParticipant('dev')],
			steeringEmitter: new TestSteeringEmitter(),
			logger: silentLogger,
		});

		await orchestrator.start();
		await expect(orchestrator.start()).rejects.toThrow('RuntimeDebugOrchestrator.start() called while already running');
		await orchestrator.stop('double-start-test');
	});

	test('start failure tears down started participants and rethrows', async () => {
		const callOrder: string[] = [];
		const failingParticipant = new TestParticipant('failing', callOrder, async () => {
			throw new Error('boom');
		});
		const healthyParticipant = new TestParticipant('healthy', callOrder);
		const orchestrator = new RuntimeDebugOrchestrator({
			participants: [failingParticipant, healthyParticipant],
			steeringEmitter: new TestSteeringEmitter(callOrder),
			logger: silentLogger,
		});

		await expect(orchestrator.start()).rejects.toThrow('boom');
		expect(failingParticipant.stopCount).toBe(1);
		expect(healthyParticipant.stopCount).toBe(1);
		expect(orchestrator.isRunning()).toBe(false);
	});

	test('stop is idempotent when not running', async () => {
		const orchestrator = new RuntimeDebugOrchestrator({
			participants: [new TestParticipant('dev')],
			steeringEmitter: new TestSteeringEmitter(),
			logger: silentLogger,
		});

		await orchestrator.stop('not-running');
		expect(orchestrator.isRunning()).toBe(false);
	});

	test('requires at least one participant', () => {
		expect(
			() =>
				new RuntimeDebugOrchestrator({
					participants: [],
					steeringEmitter: new TestSteeringEmitter(),
					logger: silentLogger,
				}),
		).toThrow('RuntimeDebugOrchestrator requires at least one participant');
	});
});
