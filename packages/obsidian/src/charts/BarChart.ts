import UnifaceChart from '@ticatec/uniface-echarts';
import type ChartEventParams from '@ticatec/uniface-echarts/dist/ChartEventParams';
import type { DataWrapper, ProcessedData } from 'packages/obsidian/src/ChartData';
import type { ChartView } from 'packages/obsidian/src/ChartView';
import { CHART_SETTINGS } from 'packages/obsidian/src/ChartView';
import type { ChartConfig } from 'packages/obsidian/src/stores';
import { validateChartConfig } from 'packages/obsidian/src/utils/configValidation';

/**
 * BarChart implementation using UnifaceChart wrapper for ECharts 6
 * Handles bar chart visualization with stacking options and interactions
 */
export class BarChart extends UnifaceChart {
	private readonly chartView: ChartView;
	private dataWrapper: DataWrapper | null = null;
	private config: ChartConfig | null = null;

	/**
	 * Creates a new BarChart instance
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
				console.warn('BarChart: Received null or undefined data wrapper');
				return;
			}

			this.dataWrapper = dataWrapper;
			this.invalidate();
		} catch (error) {
			console.error('BarChart: Failed to update data:', error);
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
	 * Creates ECharts configuration options for bar chart
	 * @returns ECharts option object
	 */
	protected createOption(): Record<string, unknown> {
		try {
			if (!this.dataWrapper) {
				console.warn('BarChart: No data wrapper available');
				return this.createEmptyOption();
			}

			const chartIdentifiers = this.dataWrapper.getChartIdentifiers();
			const hasMultipleCharts = this.dataWrapper.hasMultipleCharts();
			const hasMultipleGroups = this.dataWrapper.hasMultipleGroups();
			const showLabels = Boolean(this.chartView.config.get(CHART_SETTINGS.SHOW_LABELS));
			const showPercentages = Boolean(this.chartView.config.get(CHART_SETTINGS.SHOW_PERCENTAGES));

			// Create series for each chart
			const series = chartIdentifiers.map((_, chartIndex) => {
				const chartData = this.dataWrapper!.getFlat(chartIndex, true);
				const seriesData = this.transformDataToECharts(chartData, showPercentages);

				return {
					type: 'bar',
					name: this.dataWrapper!.getChartName(chartIndex),
					data: seriesData,
					stack: hasMultipleGroups ? 'total' : undefined,
					emphasis: {
						focus: 'series',
						blurScope: 'coordinateSystem',
					},
					label: {
						show: showLabels,
						position: 'inside' as const,
						formatter: (params: Record<string, unknown>): string => {
							const value = params.value as number;
							return showPercentages ? `${value.toFixed(1)}%` : value.toString();
						},
					},
					itemStyle: {
						borderRadius: [2, 2, 0, 0],
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
				trigger: 'axis',
				axisPointer: {
					type: 'shadow',
				},
				formatter: (params: Record<string, unknown>[]): string => {
					if (!Array.isArray(params) || params.length === 0) {
						return '';
					}

					const firstParam = params[0];
					const axisValue = firstParam.axisValue;
					let result = `X: ${axisValue}<br/>`;

					params.forEach(param => {
						const data = param.data as ProcessedData & { value: [number | string | Date, number] };
						const value = showPercentages ? `${data.value[1].toFixed(1)}%` : data.value[1].toString();
						result += `${param.seriesName}: ${value}<br/>`;
					});

					return result;
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
				type: this.getXAxisType(),
				name: this.config?.axis.xAxisName ?? 'X',
				nameLocation: 'middle' as const,
				nameGap: 30,
				show: this.config?.axis.showXAxis ?? true,
				axisLabel: {
					rotate: this.config?.axis.rotateXLabels ? 45 : this.shouldRotateLabels() ? 45 : 0,
					color: this.config?.colors.text ?? '#374151',
					fontSize: this.config?.typography.fontSize ?? 12,
					fontFamily: this.config?.typography.fontFamily ?? 'system-ui, -apple-system, sans-serif',
				},
				splitLine: {
					show: false,
				},
			};

			// Apply Y domain overrides if configured
			const [yMin, yMax] = this.dataWrapper.getYDomainForChart(0);
			const yAxis: Record<string, unknown> = {
				type: 'value' as const,
				name: showPercentages ? 'Percentage (%)' : (this.config?.axis.yAxisName ?? 'Y'),
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
					formatter: showPercentages ? '{value}%' : '{value}',
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
			console.error('BarChart: Failed to create chart options:', error);
			return this.createEmptyOption('Error creating chart configuration');
		}
	}

	/**
	 * Sets up event handlers after chart initialization
	 * @param _chart - The ECharts instance
	 */
	protected postInitialize(_chart: unknown): void {
		this.setEventHandlers({
			onClick: (params: ChartEventParams) => {
				const data = params.data as ProcessedData;
				if (data?.file) {
					void this.chartView.openFile(data.file, false);
				}
			},
			onDoubleClick: (params: ChartEventParams) => {
				const data = params.data as ProcessedData;
				if (data?.file) {
					void this.chartView.openFile(data.file, true);
				}
			},
		});
	}

	/**
	 * Determines the appropriate X-axis type based on data
	 * @returns ECharts axis type
	 */
	private getXAxisType(): 'value' | 'category' | 'time' {
		if (!this.dataWrapper) {
			return 'category';
		}

		// Sample first data point to determine type
		const sampleData = this.dataWrapper.getFlat(0);
		if (sampleData.length === 0) {
			return 'category';
		}

		const firstX = sampleData[0].x;
		if (firstX instanceof Date) {
			return 'time';
		} else if (typeof firstX === 'string') {
			return 'category';
		} else {
			// For numeric values, use category for better bar spacing
			return 'category';
		}
	}

	/**
	 * Determines if axis labels should be rotated based on data
	 * @returns Whether to rotate labels
	 */
	private shouldRotateLabels(): boolean {
		if (!this.dataWrapper) {
			return false;
		}

		const sampleData = this.dataWrapper.getFlat(0);
		if (sampleData.length === 0) {
			return false;
		}

		// Rotate labels if we have string values that might be long
		const firstX = sampleData[0].x;
		if (typeof firstX === 'string' && firstX.length > 10) {
			return true;
		}

		// Rotate if we have many data points
		return sampleData.length > 10;
	}

	/**
	 * Transforms processed data to ECharts format
	 * @param data - Array of processed data points
	 * @param showPercentages - Whether to show values as percentages
	 * @returns Array of ECharts data points
	 */
	private transformDataToECharts(data: ProcessedData[], showPercentages: boolean): (ProcessedData & { value: [number | string | Date, number] })[] {
		if (!showPercentages) {
			return data.map(point => ({
				...point,
				value: [point.x, point.y] as [number | string | Date, number],
			}));
		}

		// Calculate total for percentage calculation
		const total = data.reduce((sum, point) => sum + point.y, 0);

		return data.map(point => ({
			...point,
			value: [point.x, total > 0 ? (point.y / total) * 100 : 0] as [number | string | Date, number],
		}));
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
				type: 'category',
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
