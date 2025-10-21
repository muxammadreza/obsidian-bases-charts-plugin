import { Plugin } from 'obsidian';
import { CHART_VIEW_TYPE, ChartView } from 'packages/obsidian/src/ChartView';
import 'packages/obsidian/src/styles.css';

export default class BasesChartsPlugin extends Plugin {
	async onload(): Promise<void> {
		try {
			this.registerBasesView(CHART_VIEW_TYPE, {
				name: 'Charts',
				icon: 'lucide-pie-chart',
				factory: (controller, containerEl) => {
					try {
						return new ChartView(CHART_VIEW_TYPE, controller, containerEl);
					} catch (error) {
						console.error('Failed to create chart view:', error);
						throw error;
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
