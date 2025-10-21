import UnifaceChart from '@ticatec/uniface-echarts';
import type ChartEventParams from '@ticatec/uniface-echarts/dist/ChartEventParams';
import type { DataWrapper, ProcessedData } from 'packages/obsidian/src/ChartData';
import type { ChartView } from 'packages/obsidian/src/ChartView';
import type { ChartConfig } from 'packages/obsidian/src/stores';
import { validateChartConfig } from 'packages/obsidian/src/utils/configValidation';

/**
 * ScatterChart implementation using UnifaceChart wrapper for ECharts 6
 * Handles scatter plot visualization with click events for file navigation
 */
export class ScatterChart extends UnifaceChart {
	private readonly chartView: ChartView;
	private dataWrapper: DataWrapper | null = null;
	private config: ChartConfig | null = null;

	/**
	 * Creates a new ScatterChart instance
	 * @param chartView - The Obsidian chart view instance
	 */
	constructor(chartView: ChartView) {
		super();
		this.chartView = chartView;
	}

	/**
	 * Updates the data wrapper and triggers chart refresh
	 * @param dataWrapper - The processed data wrapper
	 */
	public updateData(dataWrapper: DataWrapper): void {
		try {
			if (!dataWrapper) {
				console.warn('ScatterChart: Received null or undefined data wrapper');
				return;
			}

			this.dataWrapper = dataWrapper;
			this.invalidate();
		} catch (error) {
			console.error('ScatterChart: Failed to update data:', error);
			// Don't throw - let the wrapper handle the error gracefully
		}
	}

	/**
	 * Updates the chart configuration and triggers refresh
	 * @param config - The chart configuration
	 */
	public updateConfig(config: ChartConfig): void {
		try {
			const validation = validateChartConfig(config);
			if (validation.success && validation.data) {
				this.config = validation.data;
				this.invalidate();
			} else {
				console.error('Invalid chart configuration:', validation.errors);
				// Keep current configuration on validation error
			}
		} catch (error) {
			console.error('Failed to update chart configuration:', error);
		}
	}

	/**
	 * Creates ECharts configuration options for scatter chart
	 * @returns ECharts option object
	 */
	protected createOption(): Record<string, unknown> {
		try {
			if (!this.dataWrapper) {
				console.warn('ScatterChart: No data wrapper available');
				return this.createEmptyOption();
			}

			const chartIdentifiers = this.dataWrapper.getChartIdentifiers();
			const hasMultipleCharts = this.dataWrapper.hasMultipleCharts();
			const hasMultipleGroups = this.dataWrapper.hasMultipleGroups();

			// Create series for each chart
			const series = chartIdentifiers.map((_, chartIndex) => {
				const chartData = this.dataWrapper!.getFlat(chartIndex);
				const seriesData = this.transformDataToECharts(chartData);

				return {
					type: 'scatter',
					name: this.dataWrapper!.getChartName(chartIndex),
					data: seriesData,
					symbolSize: 8,
					emphasis: {
						focus: 'series',
						blurScope: 'coordinateSystem',
					},
				};
			});

			// Configure legend using configuration
			const showLegend = this.config?.legend.show ?? true;
			const legend =
				(hasMultipleCharts || hasMultipleGroups) && showLegend
					? {
							show: true,
							type: 'scroll',
							orient: this.config?.legend.orient ?? 'horizontal',
							left: 'center',
							top: this.config?.legend.position === 'top' ? 'top' : 'bottom',
						}
					: { show: false };

			// Configure tooltip
			const tooltip = {
				trigger: 'item',
				formatter: (params: Record<string, unknown>): string => {
					const data = params.data as ProcessedData & { value: [number, number] };
					const label = data.label ? `<br/>Label: ${data.label}` : '';
					return `${params.seriesName}<br/>X: ${data.value[0]}<br/>Y: ${data.value[1]}${label}<br/>File: ${data.file}`;
				},
			};

			// Configure grid
			const grid = {
				left: '10%',
				right: '10%',
				bottom: '15%',
				top: hasMultipleCharts || hasMultipleGroups ? '15%' : '10%',
				containLabel: true,
			};

			// Configure axes using configuration
			const xAxis = {
				type: 'value' as const,
				name: this.config?.axis.xAxisName ?? 'X',
				nameLocation: 'middle' as const,
				nameGap: 30,
				show: this.config?.axis.showXAxis ?? true,
				splitLine: {
					show: this.config?.axis.showXGrid ?? true,
					lineStyle: {
						type: 'dashed' as const,
						opacity: 0.3,
						color: this.config?.colors.grid ?? '#e5e7eb',
					},
				},
				axisLabel: {
					rotate: this.config?.axis.rotateXLabels ? 45 : 0,
					color: this.config?.colors.text ?? '#374151',
					fontSize: this.config?.typography.fontSize ?? 12,
					fontFamily: this.config?.typography.fontFamily ?? 'system-ui, -apple-system, sans-serif',
				},
			};

			// Apply Y domain overrides if configured
			const [yMin, yMax] = this.dataWrapper.getYDomainForChart(0);
			const yAxis: Record<string, unknown> = {
				type: 'value' as const,
				name: this.config?.axis.yAxisName ?? 'Y',
				nameLocation: 'middle' as const,
				nameGap: 40,
				show: this.config?.axis.showYAxis ?? true,
				splitLine: {
					show: this.config?.axis.showYGrid ?? true,
					lineStyle: {
						type: 'dashed' as const,
						opacity: 0.3,
						color: this.config?.colors.grid ?? '#e5e7eb',
					},
				},
				axisLabel: {
					color: this.config?.colors.text ?? '#374151',
					fontSize: this.config?.typography.fontSize ?? 12,
					fontFamily: this.config?.typography.fontFamily ?? 'system-ui, -apple-system, sans-serif',
				},
			};

			if (yMin !== null && yMax !== null) {
				yAxis.min = yMin;
				yAxis.max = yMax;
			}

			return {
				tooltip,
				legend,
				grid,
				xAxis,
				yAxis,
				series,
				animation: this.config?.animation.enabled ?? true,
				animationDuration: this.config?.animation.duration ?? 300,
				animationEasing: this.config?.animation.easing ?? 'cubicInOut',
				backgroundColor: this.config?.colors.background ?? 'transparent',
			};
		} catch (error) {
			console.error('ScatterChart: Failed to create chart options:', error);
			return this.createEmptyOption('Error creating chart configuration');
		}
	}

	/**
	 * Sets up event handlers after chart initialization
	 * @param _chart - The ECharts instance
	 */
	protected postInitialize(_chart: unknown): void {
		try {
			this.setEventHandlers({
				onClick: (params: ChartEventParams) => {
					try {
						const data = params.data as ProcessedData;
						if (data?.file) {
							void this.chartView.openFile(data.file, false);
						}
					} catch (error) {
						console.error('ScatterChart: Error handling click event:', error);
					}
				},
				onDoubleClick: (params: ChartEventParams) => {
					try {
						const data = params.data as ProcessedData;
						if (data?.file) {
							void this.chartView.openFile(data.file, true);
						}
					} catch (error) {
						console.error('ScatterChart: Error handling double-click event:', error);
					}
				},
			});
		} catch (error) {
			console.error('ScatterChart: Failed to set up event handlers:', error);
		}
	}

	/**
	 * Transforms processed data to ECharts format
	 * @param data - Array of processed data points
	 * @returns Array of ECharts data points
	 */
	private transformDataToECharts(data: ProcessedData[]): (ProcessedData & { value: [number | string | Date, number] })[] {
		try {
			if (!Array.isArray(data)) {
				console.warn('ScatterChart: Invalid data format for transformation');
				return [];
			}

			return data
				.map(point => {
					if (!point?.x || !point?.y) {
						console.warn('ScatterChart: Invalid data point:', point);
						return null;
					}

					return {
						...point,
						value: [point.x, point.y] as [number | string | Date, number],
					};
				})
				.filter(Boolean) as (ProcessedData & { value: [number | string | Date, number] })[];
		} catch (error) {
			console.error('ScatterChart: Error transforming data:', error);
			return [];
		}
	}

	/**
	 * Creates empty chart configuration when no data is available
	 * @param message - Optional custom message to display
	 * @returns Empty ECharts option object
	 */
	private createEmptyOption(message: string = 'No data available'): Record<string, unknown> {
		return {
			title: {
				text: message,
				left: 'center',
				top: 'middle',
				textStyle: {
					color: 'var(--text-muted)',
					fontSize: 16,
					fontFamily: 'var(--font-ui)',
				},
			},
			xAxis: {
				type: 'value',
				show: false,
			},
			yAxis: {
				type: 'value',
				show: false,
			},
			series: [],
			backgroundColor: 'transparent',
		};
	}
}
