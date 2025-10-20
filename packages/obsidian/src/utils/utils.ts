import type { Value } from 'obsidian';
import { DateValue, NumberValue, StringValue } from 'obsidian';

const COLOR_TOKEN_REGEX = /var\(([^)]+)\)/;

const COLOR_FALLBACKS: Record<string, string> = {
	'--color-blue': '#4c9aff',
	'--color-orange': '#ff9f4d',
	'--color-red': '#ff6b6b',
	'--color-cyan': '#2bd5d5',
	'--color-green': '#4ad492',
	'--color-yellow': '#ffd866',
	'--color-purple': '#b18cff',
	'--color-pink': '#ff85d8',
	'--bases-charts-accent': '#4c9aff',
	'--bases-charts-text': '#e0e3e8',
	'--bases-charts-grid-hover': 'rgba(224, 227, 232, 0.45)',
	'--bases-charts-grid': 'rgba(224, 227, 232, 0.25)',
};

const OBSIDIAN_PALETTE_TOKENS = [
	'var(--color-blue)',
	'var(--color-orange)',
	'var(--color-red)',
	'var(--color-cyan)',
	'var(--color-green)',
	'var(--color-yellow)',
	'var(--color-purple)',
	'var(--color-pink)',
];

export function resolveCssColor(token: string, fallback?: string): string {
	const match = COLOR_TOKEN_REGEX.exec(token);
	if (!match) {
		return token;
	}
	const [rawVariable] = match.slice(1, 2);
	const [variableName, explicitFallback] = rawVariable.split(',').map(segment => segment.trim());
	if (typeof document !== 'undefined') {
		const root = document.documentElement;
		const resolved = getComputedStyle(root).getPropertyValue(variableName).trim();
		if (resolved) {
			return resolved;
		}
	}
	return explicitFallback ?? fallback ?? COLOR_FALLBACKS[variableName] ?? token;
}

export function getResolvedObsidianPalette(): string[] {
	return OBSIDIAN_PALETTE_TOKENS.map(token => resolveCssColor(token));
}

export function getResolvedObsidianPaletteColor(index: number): string {
	const palette = getResolvedObsidianPalette();
	return palette[index % palette.length];
}

export function getResolvedAccentColor(): string {
	return resolveCssColor('var(--bases-charts-accent)', COLOR_FALLBACKS['--bases-charts-accent']);
}

export function toCompactString(datum: number | string | symbol | boolean | Date | null | undefined): string {
	if (datum == null) {
		return '';
	}
	if (typeof datum === 'number') {
		return datum.toLocaleString(undefined, { notation: 'compact', roundingPriority: 'auto', maximumSignificantDigits: 4 });
	}
	if (typeof datum === 'boolean') {
		return datum ? 'Yes' : 'No';
	}
	if (typeof datum === 'symbol') {
		return Symbol.keyFor(datum) ?? '';
	}
	if (datum instanceof Date) {
		return datum.toLocaleDateString();
	}
	return datum;
}

export const OBSIDIAN_COLOR_PALETTE = OBSIDIAN_PALETTE_TOKENS;

export const OBSIDIAN_DEFAULT_SINGLE_COLOR = (_: unknown): string => getResolvedAccentColor();

export function parseValueAsNumber(value: Value | null): number | null {
	if (!value) {
		return null;
	}

	if (value instanceof NumberValue) {
		return value.data;
	}
	if (value instanceof StringValue) {
		const parsed = parseFloat(value.data);
		return isNaN(parsed) ? null : parsed;
	}
	return null;
}

export function parseValueAsX(value: Value | null): number | Date | string | null {
	if (!value) {
		return null;
	}

	if (value instanceof NumberValue) {
		return value.data;
	}
	if (value instanceof StringValue) {
		const parsed = parseFloat(value.data);
		return isNaN(parsed) ? value.data : parsed;
	}
	if (value instanceof DateValue) {
		return new Date(value.toString());
	}
	return null;
}
