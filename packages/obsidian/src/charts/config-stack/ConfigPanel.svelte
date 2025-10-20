<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ConfigStackPatch, ConfigStackState } from 'packages/obsidian/src/charts/config-stack/types';

	interface Props {
		chartId: string;
		state: ConfigStackState;
	}

	let { chartId, state }: Props = $props();

	const dispatch = createEventDispatcher<{ change: ConfigStackPatch }>();

	function emitChange<T extends keyof ConfigStackState>(section: T, changes: Partial<ConfigStackState[T]>): void {
		dispatch('change', {
			section,
			changes,
		});
	}

	function handleNumberChange(section: keyof ConfigStackState, key: string, event: Event): void {
		const target = event.currentTarget as HTMLInputElement;
		const value = target.value.trim();
		const next = value === '' ? null : Number(value);
		emitChange(section, { [key]: Number.isFinite(next) ? next : null } as Partial<ConfigStackState[typeof section]>);
	}

	function handleToggle(section: keyof ConfigStackState, key: string, event: Event): void {
		const target = event.currentTarget as HTMLInputElement;
		emitChange(section, { [key]: target.checked } as Partial<ConfigStackState[typeof section]>);
	}

	function handleSelect<T extends keyof ConfigStackState>(section: T, key: keyof ConfigStackState[T], event: Event): void {
		const target = event.currentTarget as HTMLInputElement | HTMLSelectElement;
		emitChange(section, { [key]: target.value } as Partial<ConfigStackState[T]>);
	}

</script>

<div class="config-panel" data-testid="config-stack-panel">
	<section aria-labelledby={`config-${chartId}-axes`}>
		<header id={`config-${chartId}-axes`}>Axes</header>
		<div class="section-body">
			<label>
				<span>Y minimum</span>
				<input
					type="number"
					placeholder="auto"
					value={state.axes.yMin ?? ''}
					onchange={(event) => handleNumberChange('axes', 'yMin', event)}
				/>
			</label>
			<label>
				<span>Y maximum</span>
				<input
					type="number"
					placeholder="auto"
					value={state.axes.yMax ?? ''}
					onchange={(event) => handleNumberChange('axes', 'yMax', event)}
				/>
			</label>
			<label class="toggle" data-testid="config-stack-axes-gridlines">
				<input type="checkbox" checked={state.axes.showGridLines} onchange={(event) => handleToggle('axes', 'showGridLines', event)} />
				<span>Show grid lines</span>
			</label>
			<label class="toggle">
				<input type="checkbox" checked={state.axes.invertX} onchange={(event) => handleToggle('axes', 'invertX', event)} />
				<span>Invert X axis</span>
			</label>
			<label>
				<span>X axis type</span>
				<select value={state.axes.xType} onchange={(event) => handleSelect('axes', 'xType', event)}>
					<option value="auto">Auto</option>
					<option value="value">Numeric</option>
					<option value="category">Category</option>
					<option value="time">Time</option>
				</select>
			</label>
		</div>
	</section>

	<section aria-labelledby={`config-${chartId}-series`}>
		<header id={`config-${chartId}-series`}>Series</header>
		<div class="section-body">
			<label class="toggle" data-testid="config-stack-series-labels">
				<input type="checkbox" checked={state.series.showLabels} onchange={(event) => handleToggle('series', 'showLabels', event)} />
				<span>Display labels</span>
			</label>
			<label class="toggle">
				<input type="checkbox" checked={state.series.showPercentages} onchange={(event) => handleToggle('series', 'showPercentages', event)} />
				<span>Show as percentages</span>
			</label>
			<label class="toggle">
				<input type="checkbox" checked={state.series.smoothLines} onchange={(event) => handleToggle('series', 'smoothLines', event)} />
				<span>Smooth lines</span>
			</label>
			<label class="toggle">
				<input type="checkbox" checked={state.series.stackSeries} onchange={(event) => handleToggle('series', 'stackSeries', event)} />
				<span>Stack series</span>
			</label>
			<label>
				<span>Symbol size</span>
				<input
					type="number"
					min="1"
					max="40"
					value={state.series.symbolSize}
					onchange={(event) => handleNumberChange('series', 'symbolSize', event)}
				/>
			</label>
			<label class="toggle">
				<input type="checkbox" checked={state.series.animation} onchange={(event) => handleToggle('series', 'animation', event)} />
				<span>Enable animation</span>
			</label>
		</div>
	</section>

	<section aria-labelledby={`config-${chartId}-legend`}>
		<header id={`config-${chartId}-legend`}>Legend</header>
		<div class="section-body">
			<label class="toggle" data-testid="config-stack-legend-visible">
				<input type="checkbox" checked={state.legend.visible} onchange={(event) => handleToggle('legend', 'visible', event)} />
				<span>Show legend</span>
			</label>
			<label>
				<span>Position</span>
				<select value={state.legend.position} onchange={(event) => handleSelect('legend', 'position', event)}>
					<option value="top">Top</option>
					<option value="right">Right</option>
					<option value="bottom">Bottom</option>
					<option value="left">Left</option>
				</select>
			</label>
			<label>
				<span>Orientation</span>
				<select value={state.legend.orient} onchange={(event) => handleSelect('legend', 'orient', event)}>
					<option value="horizontal">Horizontal</option>
					<option value="vertical">Vertical</option>
				</select>
			</label>
		</div>
	</section>

	<section aria-labelledby={`config-${chartId}-tooltip`}>
		<header id={`config-${chartId}-tooltip`}>Tooltip</header>
		<div class="section-body">
			<label class="toggle">
				<input type="checkbox" checked={state.tooltip.show} onchange={(event) => handleToggle('tooltip', 'show', event)} />
				<span>Enable tooltip</span>
			</label>
			<label>
				<span>Trigger</span>
				<select value={state.tooltip.trigger} onchange={(event) => handleSelect('tooltip', 'trigger', event)}>
					<option value="item">Item</option>
					<option value="axis">Axis</option>
				</select>
			</label>
			<label class="toggle">
				<input type="checkbox" checked={state.tooltip.shared} onchange={(event) => handleToggle('tooltip', 'shared', event)} />
				<span>Shared tooltip</span>
			</label>
		</div>
	</section>

	<section aria-labelledby={`config-${chartId}-dataset`}>
		<header id={`config-${chartId}-dataset`}>Dataset</header>
		<div class="section-body">
			<label>
				<span>Sampling</span>
				<select value={state.dataset.sampling} onchange={(event) => handleSelect('dataset', 'sampling', event)}>
					<option value="auto">Auto</option>
					<option value="lttb">Largest triangle</option>
					<option value="average">Average</option>
					<option value="min">Min</option>
					<option value="max">Max</option>
				</select>
			</label>
			<label>
				<span>Sort order</span>
				<select value={state.dataset.sortOrder} onchange={(event) => handleSelect('dataset', 'sortOrder', event)}>
					<option value="none">None</option>
					<option value="ascending">Ascending</option>
					<option value="descending">Descending</option>
				</select>
			</label>
		</div>
	</section>

	<section aria-labelledby={`config-${chartId}-interactions`}>
		<header id={`config-${chartId}-interactions`}>Interactions</header>
		<div class="section-body">
			<label class="toggle">
				<input type="checkbox" checked={state.interactions.brushEnabled} onchange={(event) => handleToggle('interactions', 'brushEnabled', event)} />
				<span>Enable brush</span>
			</label>
			<label class="toggle">
				<input type="checkbox" checked={state.interactions.dataZoomEnabled} onchange={(event) => handleToggle('interactions', 'dataZoomEnabled', event)} />
				<span>Enable data zoom</span>
			</label>
			<label class="toggle">
				<input type="checkbox" checked={state.interactions.hoverLink} onchange={(event) => handleToggle('interactions', 'hoverLink', event)} />
				<span>Link hover highlights</span>
			</label>
		</div>
	</section>

	<section aria-labelledby={`config-${chartId}-theming`}>
		<header id={`config-${chartId}-theming`}>Theming</header>
		<div class="section-body">
			<label>
				<span>Theme</span>
				<select value={state.theming.themeId} onchange={(event) => handleSelect('theming', 'themeId', event)}>
					<option value="auto">Auto</option>
					<option value="light">Light</option>
					<option value="dark">Dark</option>
				</select>
			</label>
			<label>
				<span>Accent color</span>
				<input type="color" value={state.theming.accentColor} onchange={(event) => handleSelect('theming', 'accentColor', event)} />
			</label>
		</div>
	</section>
</div>

<style>
	.config-panel {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
		max-height: 360px;
		overflow-y: auto;
		padding: var(--size-4-3);
	}

	section {
		display: flex;
		flex-direction: column;
		gap: var(--size-2-2);
		background: rgba(0, 0, 0, 0.05);
		padding: var(--size-4-2);
		border-radius: var(--radius-s);
	}

	header {
		font-weight: 600;
		font-size: var(--font-small);
		color: var(--bases-charts-text);
	}

	.section-body {
		display: grid;
		gap: var(--size-2-2);
	}

	label {
		display: flex;
		flex-direction: column;
		gap: var(--size-2-1);
		font-size: var(--font-small);
		color: var(--bases-charts-text);
	}

	label.toggle {
		flex-direction: row;
		align-items: center;
		gap: var(--size-2-2);
	}

	label > span {
		font-weight: 500;
	}

	input[type='number'],
	select {
		padding: var(--size-2-1) var(--size-2-2);
		border-radius: var(--radius-s);
		border: 1px solid rgba(0, 0, 0, 0.2);
		background: var(--bases-charts-surface, #2c2c2c);
		color: var(--bases-charts-text);
	}

	input[type='color'] {
		width: 100%;
		height: 32px;
		border: 1px solid rgba(0, 0, 0, 0.2);
		border-radius: var(--radius-s);
	}

	input[type='checkbox'] {
		width: 16px;
		height: 16px;
	}
</style>
