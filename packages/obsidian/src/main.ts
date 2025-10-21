import { Plugin } from 'obsidian';
import { BAR_CHART_VIEW_TYPE, ChartView, LINE_CHART_VIEW_TYPE, SCATTER_CHART_VIEW_TYPE } from 'packages/obsidian/src/ChartView';
import 'packages/obsidian/src/styles.css';

export default class BasesChartsPlugin extends Plugin {
	async onload(): Promise<void> {
		try {
			// Register scatter chart view with ECharts wrapper integration
			this.registerBasesView(SCATTER_CHART_VIEW_TYPE, {
				name: 'Scatter Chart',
				icon: 'lucide-chart-scatter',
				factory: (controller, containerEl) => {
					try {
						return new ChartView(SCATTER_CHART_VIEW_TYPE, controller, containerEl);
					} catch (error) {
						console.error('Failed to create scatter chart view:', error);
						throw error;
					}
				},
				options: () => {
					try {
						return ChartView.getViewOptions(SCATTER_CHART_VIEW_TYPE);
					} catch (error) {
						console.error('Failed to get scatter chart view options:', error);
						return [];
					}
				},
			});

			// Register line chart view with ECharts wrapper integration
			this.registerBasesView(LINE_CHART_VIEW_TYPE, {
				name: 'Line Chart',
				icon: 'lucide-chart-line',
				factory: (controller, containerEl) => {
					try {
						return new ChartView(LINE_CHART_VIEW_TYPE, controller, containerEl);
					} catch (error) {
						console.error('Failed to create line chart view:', error);
						throw error;
					}
				},
				options: () => {
					try {
						return ChartView.getViewOptions(LINE_CHART_VIEW_TYPE);
					} catch (error) {
						console.error('Failed to get line chart view options:', error);
						return [];
					}
				},
			});

			// Register bar chart view with ECharts wrapper integration
			this.registerBasesView(BAR_CHART_VIEW_TYPE, {
				name: 'Bar Chart',
				icon: 'lucide-chart-column',
				factory: (controller, containerEl) => {
					try {
						return new ChartView(BAR_CHART_VIEW_TYPE, controller, containerEl);
					} catch (error) {
						console.error('Failed to create bar chart view:', error);
						throw error;
					}
				},
				options: () => {
					try {
						return ChartView.getViewOptions(BAR_CHART_VIEW_TYPE);
					} catch (error) {
						console.error('Failed to get bar chart view options:', error);
						return [];
					}
				},
			});
		} catch (error) {
			console.error('Failed to load Bases Charts plugin:', error);
			throw error;
		}
	}

	onunload(): void {
		try {
			// Cleanup is handled automatically by the wrapper and Obsidian's bases system
			// No manual cleanup needed for chart instances
		} catch (error) {
			console.error('Error during plugin unload:', error);
			// Continue unloading even if there are errors
		}
	}
}
