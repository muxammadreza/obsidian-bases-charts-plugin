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

	return {
		setIcon(iconEl: HTMLElement, iconName: string): void {
			// do nothing
		},
		moment: Moment,
		NumberValue,
		StringValue,
		DateValue,
	};
});
