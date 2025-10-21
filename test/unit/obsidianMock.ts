import { mock } from 'bun:test';
import Moment from 'moment';

// Mock classes for Obsidian Value types
class NumberValue {
	constructor(public data: number) {}
}

class StringValue {
	constructor(public data: string) {}
}

class DateValue {
	constructor(public data: string | Date) {}
	toString() {
		return this.data.toString();
	}
}

mock.module('obsidian', () => ({
	setIcon(iconEl: HTMLElement, iconName: string): void {
		// do nothing
	},
	moment: Moment,
	BasesView: class BasesView {
		constructor() {}
	},
	Events: class Events {
		on() {}
		off() {}
		trigger() {}
		offref() {}
	},
	NumberValue,
	StringValue,
	DateValue,
	MarkdownView: class MarkdownView {},
	FileView: class FileView {},
}));
