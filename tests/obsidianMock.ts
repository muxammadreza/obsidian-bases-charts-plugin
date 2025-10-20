import { mock } from 'bun:test';
import Moment from 'moment';

mock.module('obsidian', () => {
	class NumberValue {
		constructor(public readonly data: number) {}
	}

	class StringValue {
		constructor(public readonly data: string) {}
	}

	class DateValue {
		private readonly value: string;

		constructor(value: string) {
			this.value = value;
		}

		toString(): string {
			return this.value;
		}
	}

	class Notice {
		message: string;

		constructor(message: string) {
			this.message = message;
		}

		hide(): void {
			// do nothing
		}
	}

	class Events {
		trigger(): void {
			// do nothing
		}

		on(): void {
			// do nothing
		}
	}

	class BasesView {
		constructor(public readonly controller: unknown) {}

		get data(): undefined {
			return undefined;
		}

		get config(): undefined {
			return undefined;
		}

		onload(): void {}

		onunload(): void {}
	}

	return {
		setIcon(iconEl: HTMLElement, iconName: string): void {
			// do nothing
		},
		moment: Moment,
		NumberValue,
		StringValue,
		DateValue,
		Notice,
		Events,
		BasesView,
	};
});
