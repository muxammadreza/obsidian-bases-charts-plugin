import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { basename } from 'path';
import type { SteeringDirectiveEmitter as SteeringEmitterInterface } from './RuntimeDebugOrchestrator';

export interface SteeringDirectiveEmitterOptions {
	steeringPath?: string;
	console?: Pick<typeof console, 'log' | 'warn'>;
	maxLines?: number;
}

const DEFAULT_STEERING_PATH = '.codex/steering/runtime-debugging.md';

export class RuntimeSteeringDirectiveEmitter implements SteeringEmitterInterface {
	private readonly steeringPath: string;
	private readonly output: Pick<typeof console, 'log' | 'warn'>;
	private readonly maxLines: number;
	private cachedSummary: string | null = null;

	constructor(options: SteeringDirectiveEmitterOptions = {}) {
		this.steeringPath = options.steeringPath ?? DEFAULT_STEERING_PATH;
		this.output = options.console ?? console;
		this.maxLines = Math.max(1, options.maxLines ?? 12);
	}

	public async emitStartup(): Promise<void> {
		const summary = await this.loadSummary();
		this.output.log(summary);
	}

	public async shutdown(reason?: string): Promise<void> {
		if (reason) {
			this.output.log(`[steering] runtime steering emitter shutdown (${reason}).`);
		}
	}

	private async loadSummary(): Promise<string> {
		if (this.cachedSummary !== null) {
			return this.cachedSummary;
		}

		if (!existsSync(this.steeringPath)) {
			const message = `[steering] No steering document found at ${this.steeringPath}.`;
			this.cachedSummary = message;
			return message;
		}

		try {
			const fileContents = await readFile(this.steeringPath, 'utf8');
			this.cachedSummary = this.buildSummary(fileContents);
			return this.cachedSummary;
		} catch (error) {
			const message = `[steering] Failed to read ${basename(this.steeringPath)}: ${error instanceof Error ? error.message : String(error)}`;
			this.output.warn(message);
			this.cachedSummary = message;
			return message;
		}
	}

	private buildSummary(content: string): string {
		const lines = content
			.split(/\r?\n/)
			.filter(line => line.trim() !== '')
			.slice(0, this.maxLines);

		const heading = `[steering] Loaded runtime debugging guide (${this.steeringPath})`;
		return `${heading}\n${lines.join('\n')}`;
	}
}
