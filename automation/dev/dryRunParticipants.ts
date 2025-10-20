import type { LifecycleParticipant } from './RuntimeDebugOrchestrator';
import type { StreamMultiplexer } from './StreamMultiplexer';

interface DryRunOptions {
	multiplexer: StreamMultiplexer;
	intervalMs?: number;
}

export function createDryRunParticipants(options: DryRunOptions): LifecycleParticipant[] {
	const { multiplexer, intervalMs = 500 } = options;
	return [new DryRunBuildParticipant(multiplexer, intervalMs), new DryRunRuntimeParticipant(multiplexer, intervalMs)];
}

class DryRunBuildParticipant implements LifecycleParticipant {
	public readonly name = 'dry-run-build';
	private timer?: ReturnType<typeof setInterval>;

	constructor(
		private readonly multiplexer: StreamMultiplexer,
		private readonly intervalMs: number,
	) {}

	start(): void {
		this.emitCycle();
		this.timer = setInterval(() => this.emitCycle(), this.intervalMs);
	}

	stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	private emitCycle(): void {
		const timestamp = Date.now();
		this.multiplexer.ingestBuildEvent({
			type: 'build-log',
			message: 'Dry-run build watcher active…',
			level: 'info',
			stream: 'stdout',
			timestamp,
		});
		this.multiplexer.ingestBuildEvent({
			type: 'build-status',
			status: 'clean',
			timestamp,
		});
	}
}

class DryRunRuntimeParticipant implements LifecycleParticipant {
	public readonly name = 'dry-run-runtime';
	private timer?: ReturnType<typeof setInterval>;
	private toggle = false;

	constructor(
		private readonly multiplexer: StreamMultiplexer,
		private readonly intervalMs: number,
	) {}

	start(): void {
		this.emitCycle();
		this.timer = setInterval(() => this.emitCycle(), this.intervalMs);
	}

	stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	private emitCycle(): void {
		const timestamp = Date.now();
		if (this.toggle) {
			this.multiplexer.ingestRuntimeEvent({
				type: 'runtime-log',
				level: 'info',
				message: 'Dry-run console heartbeat.',
				origin: 'console',
				timestamp,
			});
		} else {
			this.multiplexer.ingestRuntimeEvent({
				type: 'runtime-error',
				message: 'Dry-run simulated runtime error.',
				origin: 'console',
				timestamp,
			});
		}
		this.toggle = !this.toggle;
	}
}
