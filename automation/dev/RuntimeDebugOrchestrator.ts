export interface LifecycleParticipant {
	readonly name: string;
	start(): Promise<void> | void;
	stop(reason?: string): Promise<void> | void;
}

export interface SteeringDirectiveEmitter {
	emitStartup(): Promise<void>;
	shutdown?(reason?: string): Promise<void> | void;
}

export interface RuntimeDebugOrchestratorOptions {
	participants: LifecycleParticipant[];
	steeringEmitter: SteeringDirectiveEmitter;
	logger?: {
		info(message: string): void;
		warn(message: string): void;
		error(message: string): void;
	};
	readinessMessage?: string;
}

export class RuntimeDebugOrchestrator {
	private readonly participants: LifecycleParticipant[];
	private readonly steeringEmitter: SteeringDirectiveEmitter;
	private readonly logger: Required<NonNullable<RuntimeDebugOrchestratorOptions['logger']>>;
	private readonly readinessMessage: string;
	private running = false;
	private shuttingDown = false;

	constructor(options: RuntimeDebugOrchestratorOptions) {
		if (options.participants.length === 0) {
			throw new Error('RuntimeDebugOrchestrator requires at least one participant');
		}

		this.participants = [...options.participants];
		this.steeringEmitter = options.steeringEmitter;
		this.logger = options.logger ?? {
			info: console.log,
			warn: console.warn,
			error: console.error,
		};
		this.readinessMessage = options.readinessMessage ?? 'Runtime debugging orchestrator is ready.';
	}

	public isRunning(): boolean {
		return this.running;
	}

	public async start(): Promise<void> {
		if (this.running) {
			throw new Error('RuntimeDebugOrchestrator.start() called while already running');
		}

		this.running = true;
		this.shuttingDown = false;

		try {
			await Promise.all(this.participants.map(participant => participant.start()));
			await this.steeringEmitter.emitStartup();
			this.logger.info(this.readinessMessage);
		} catch (error) {
			this.logger.error(`Failed to start runtime debugging orchestrator: ${error instanceof Error ? error.message : String(error)}`);
			await this.shutdownParticipants('startup-error');
			this.running = false;
			throw error;
		}
	}

	public async stop(reason: string = 'manual-stop'): Promise<void> {
		if (!this.running || this.shuttingDown) {
			return;
		}

		this.shuttingDown = true;
		await this.shutdownParticipants(reason);
		if (typeof this.steeringEmitter.shutdown === 'function') {
			await this.steeringEmitter.shutdown(reason);
		}
		this.running = false;
		this.shuttingDown = false;
		this.logger.info(`Runtime debugging orchestrator stopped (${reason}).`);
	}

	private async shutdownParticipants(reason: string): Promise<void> {
		await Promise.allSettled(
			[...this.participants].reverse().map(async participant => {
				try {
					await participant.stop(reason);
				} catch (error) {
					this.logger.warn(`Failed to stop participant "${participant.name}": ${error instanceof Error ? error.message : String(error)}`);
				}
			}),
		);
	}
}
