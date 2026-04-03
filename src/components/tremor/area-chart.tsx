"use client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any

import React from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";
import {
  Area,
  CartesianGrid,
  Dot,
  Label,
  Line,
  AreaChart as RechartsAreaChart,
  Legend as RechartsLegend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AxisDomain } from "recharts/types/util/types";

import {
  AvailableChartColors,
  constructCategoryColors,
  getColorClassName,
  getYAxisDomain,
  hasOnlyOneValueForKey,
  type AvailableChartColorsKeys,
} from "@/lib/chartUtils";
import { useOnWindowResize } from "@/lib/useOnWindowResize";
import { cx } from "@/lib/utils";

export { TREMOR_CHART_COLORS } from "@/lib/chartUtils";

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export type AreaChartEventProps = {
  eventType: "category" | "dot";
  categoryClicked: string;
  [key: string]: number | string;
} | null;

export interface TooltipProps {
  active: boolean | undefined;
  payload: any;
  label: string;
}

type AreaChartType = "default" | "stacked" | "percent";

type FillType = "gradient" | "solid" | "none";

interface ActiveDot {
  index?: number;
  dataKey?: string;
}

// ────────────────────────────────────────────────────────────────
// Legend
// ────────────────────────────────────────────────────────────────

interface ScrollButtonProps {
  icon: React.ElementType;
  onClick?: () => void;
  disabled?: boolean;
}

const ScrollButton = ({ icon, onClick, disabled }: ScrollButtonProps) => {
  const Icon = icon;
  const [isPressed, setIsPressed] = React.useState(false);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    if (isPressed) {
      intervalRef.current = setInterval(() => {
        onClick?.();
      }, 300);
    } else {
      clearInterval(intervalRef.current as ReturnType<typeof setInterval>);
    }
    return () =>
      clearInterval(intervalRef.current as ReturnType<typeof setInterval>);
  }, [isPressed, onClick]);

  React.useEffect(() => {
    if (disabled) {
      clearInterval(intervalRef.current as ReturnType<typeof setInterval>);
      setIsPressed(false);
    }
  }, [disabled]);

  return (
    <button
      type="button"
      className={cx(
        "group inline-flex size-5 items-center truncate rounded transition",
        disabled
          ? "cursor-not-allowed text-gray-400 dark:text-gray-600"
          : "cursor-pointer text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50",
      )}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        setIsPressed(true);
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
        setIsPressed(false);
      }}
    >
      <Icon className="size-full" aria-hidden="true" />
    </button>
  );
};

interface LegendProps extends React.OlHTMLAttributes<HTMLOListElement> {
  categories: string[];
  colors?: AvailableChartColorsKeys[];
  onClickLegendItem?: (category: string, color: string) => void;
  activeLegend?: string;
  enableLegendSlider?: boolean;
}

type HasScrollProps = {
  left: boolean;
  right: boolean;
};

const Legend = React.forwardRef<HTMLOListElement, LegendProps>((props, ref) => {
  const {
    categories,
    colors = AvailableChartColors,
    className,
    onClickLegendItem,
    activeLegend,
    enableLegendSlider = false,
    ...other
  } = props;

  const scrollableRef = React.useRef<HTMLInputElement>(null);
  const scrollButtonsRef = React.useRef<HTMLDivElement>(null);
  const [hasScroll, setHasScroll] = React.useState<HasScrollProps | null>(null);
  const [isKeyDowned, setIsKeyDowned] = React.useState<string | null>(null);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const checkScroll = React.useCallback(() => {
    const scrollable = scrollableRef?.current;
    if (!scrollable) return;

    const hasLeftScroll = scrollable.scrollLeft > 0;
    const hasRightScroll =
      scrollable.scrollWidth - scrollable.clientWidth > scrollable.scrollLeft;

    setHasScroll({ left: hasLeftScroll, right: hasRightScroll });
  }, [setHasScroll]);

  const scrollToTest = React.useCallback(
    (direction: "left" | "right") => {
      const scrollable = scrollableRef?.current;
      const scrollButtons = scrollButtonsRef?.current;
      if (!scrollable || !scrollButtons) return;

      const scrollButtonsWidth = scrollButtons.clientWidth;
      const scrollAmount =
        direction === "left"
          ? scrollable.clientWidth - scrollButtonsWidth
          : scrollButtonsWidth - scrollable.clientWidth;

      scrollable.scrollTo({
        left: scrollable.scrollLeft + scrollAmount,
        behavior: "smooth",
      });
      setTimeout(() => {
        checkScroll();
      }, 400);
    },
    [checkScroll],
  );

  React.useEffect(() => {
    const keyDownHandler = (key: string) => {
      if (key === "ArrowLeft") {
        scrollToTest("left");
      } else if (key === "ArrowRight") {
        scrollToTest("right");
      }
    };
    if (isKeyDowned) {
      keyDownHandler(isKeyDowned);
      intervalRef.current = setInterval(() => {
        keyDownHandler(isKeyDowned);
      }, 300);
    } else {
      clearInterval(intervalRef.current as ReturnType<typeof setInterval>);
    }
    return () =>
      clearInterval(intervalRef.current as ReturnType<typeof setInterval>);
  }, [isKeyDowned, scrollToTest]);

  const keyDown = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setIsKeyDowned(e.key);
    }
  };

  const keyUp = (e: KeyboardEvent) => {
    e.stopPropagation();
    setIsKeyDowned(null);
  };

  React.useEffect(() => {
    const scrollable = scrollableRef?.current;
    if (enableLegendSlider) {
      checkScroll();
      scrollable?.addEventListener("keydown", keyDown);
      scrollable?.addEventListener("keyup", keyUp);
    }

    return () => {
      scrollable?.removeEventListener("keydown", keyDown);
      scrollable?.removeEventListener("keyup", keyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableLegendSlider, checkScroll]);

  useOnWindowResize(checkScroll);

  return (
    <ol
      ref={ref}
      className={cx("relative overflow-hidden", className)}
      {...other}
    >
      <div
        ref={scrollableRef}
        tabIndex={enableLegendSlider ? 0 : undefined}
        className={cx(
          "flex h-full",
          enableLegendSlider
            ? hasScroll?.right || hasScroll?.left
              ? "snap-mandatory items-center overflow-auto pl-4 pr-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : ""
            : "flex-wrap",
        )}
      >
        {categories.map((category, index) => (
          <LegendItem
            key={`item-${index}`}
            name={category}
            color={colors[index % colors.length]}
            onClick={onClickLegendItem}
            activeLegend={activeLegend}
          />
        ))}
      </div>
      {enableLegendSlider && (hasScroll?.right || hasScroll?.left) ? (
        <div
          className={cx(
            "absolute bottom-0 right-0 top-0 flex h-full items-center justify-center pr-1",
            "bg-white dark:bg-gray-950",
          )}
          ref={scrollButtonsRef}
        >
          <ScrollButton
            icon={RiArrowLeftSLine}
            onClick={() => {
              setIsKeyDowned(null);
              scrollToTest("left");
            }}
            disabled={!hasScroll?.left}
          />
          <ScrollButton
            icon={RiArrowRightSLine}
            onClick={() => {
              setIsKeyDowned(null);
              scrollToTest("right");
            }}
            disabled={!hasScroll?.right}
          />
        </div>
      ) : null}
    </ol>
  );
});

Legend.displayName = "Legend";

interface LegendItemProps {
  name: string;
  color: AvailableChartColorsKeys;
  onClick?: (category: string, color: string) => void;
  activeLegend?: string;
}

const LegendItem = ({
  name,
  color,
  onClick,
  activeLegend,
}: LegendItemProps) => {
  const hasOnValueChange = !!onClick;
  return (
    <li
      className={cx(
        "group inline-flex flex-nowrap items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 transition",
        hasOnValueChange
          ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          : "cursor-default",
        activeLegend && activeLegend !== name ? "opacity-40" : "opacity-100",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(name, color);
      }}
    >
      <span
        className={cx(
          "size-2 shrink-0 rounded-sm",
          getColorClassName(color, "bg"),
          activeLegend && activeLegend !== name
            ? "opacity-40"
            : "opacity-100",
        )}
        aria-hidden="true"
      />
      <p
        className={cx(
          "truncate whitespace-nowrap text-xs",
          "text-gray-700 dark:text-gray-300",
          hasOnValueChange &&
            "group-hover:text-gray-900 dark:group-hover:text-gray-50",
          activeLegend && activeLegend !== name
            ? "opacity-40"
            : "opacity-100",
        )}
      >
        {name}
      </p>
    </li>
  );
};

// ────────────────────────────────────────────────────────────────
// Tooltip
// ────────────────────────────────────────────────────────────────

interface ChartTooltipRowProps {
  value: string;
  name: string;
  color: string;
}

const ChartTooltipRow = ({ value, name, color }: ChartTooltipRowProps) => (
  <div className="flex items-center justify-between space-x-8">
    <div className="flex items-center space-x-2">
      <span
        aria-hidden="true"
        className={cx("size-2 shrink-0 rounded-sm", color)}
      />
      <p
        className={cx(
          "whitespace-nowrap text-right text-xs",
          "text-gray-700 dark:text-gray-300",
        )}
      >
        {name}
      </p>
    </div>
    <p
      className={cx(
        "whitespace-nowrap text-right text-xs font-medium tabular-nums",
        "text-gray-900 dark:text-gray-50",
      )}
    >
      {value}
    </p>
  </div>
);

interface ChartTooltipProps {
  active: boolean | undefined;
  payload: any;
  label: string;
  categoryColors: Map<string, AvailableChartColorsKeys>;
  valueFormatter: (value: number) => string;
}

const ChartTooltip = ({
  active,
  payload,
  label,
  categoryColors,
  valueFormatter,
}: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    const filteredPayload = payload.filter((item: any) => item.type !== "none");
    return (
      <div
        className={cx(
          "rounded-md border text-sm shadow-md",
          "border-gray-200 dark:border-gray-800",
          "bg-white dark:bg-gray-950",
        )}
      >
        <div
          className={cx("border-b border-inherit px-4 py-2")}
        >
          <p
            className={cx(
              "font-medium",
              "text-gray-900 dark:text-gray-50",
            )}
          >
            {label}
          </p>
        </div>
        <div className={cx("space-y-1 px-4 py-2")}>
          {filteredPayload.map(
            (
              { value, name }: { value: number; name: string },
              index: number,
            ) => (
              <ChartTooltipRow
                key={`id-${index}`}
                value={valueFormatter(value)}
                name={name}
                color={getColorClassName(
                  categoryColors.get(name) as AvailableChartColorsKeys,
                  "bg",
                )}
              />
            ),
          )}
        </div>
      </div>
    );
  }
  return null;
};

// ────────────────────────────────────────────────────────────────
// AreaChart
// ────────────────────────────────────────────────────────────────

interface AreaChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: Record<string, any>[];
  index: string;
  categories: string[];
  colors?: AvailableChartColorsKeys[];
  valueFormatter?: (value: number) => string;
  startEndOnly?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGridLines?: boolean;
  yAxisWidth?: number;
  intervalType?: "preserveStartEnd" | "equidistantPreserveStart";
  showTooltip?: boolean;
  showLegend?: boolean;
  autoMinValue?: boolean;
  minValue?: number;
  maxValue?: number;
  allowDecimals?: boolean;
  onValueChange?: (value: AreaChartEventProps) => void;
  enableLegendSlider?: boolean;
  tickGap?: number;
  connectNulls?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  type?: AreaChartType;
  legendPosition?: "left" | "center" | "right";
  fill?: FillType;
  tooltipCallback?: (tooltipCallbackContent: TooltipProps) => void;
  customTooltip?: React.ComponentType<TooltipProps>;
}

const AreaChart = React.forwardRef<HTMLDivElement, AreaChartProps>(
  (props, ref) => {
    const {
      data = [],
      categories = [],
      index,
      colors = AvailableChartColors,
      valueFormatter = (value: number) => value.toString(),
      startEndOnly = false,
      showXAxis = true,
      showYAxis = true,
      showGridLines = true,
      yAxisWidth = 56,
      intervalType = "equidistantPreserveStart",
      showTooltip = true,
      showLegend = true,
      autoMinValue = false,
      minValue,
      maxValue,
      allowDecimals = true,
      onValueChange,
      enableLegendSlider = false,
      tickGap = 5,
      connectNulls = false,
      xAxisLabel,
      yAxisLabel,
      type = "default",
      legendPosition = "right",
      fill = "gradient",
      tooltipCallback,
      customTooltip,
      className,
      ...other
    } = props;

    const CustomTooltip = customTooltip;

    const paddingValue =
      (!showXAxis && !showYAxis) || (startEndOnly && !showYAxis) ? 0 : 20;

    const [legendHeight, setLegendHeight] = React.useState(60);
    const [activeLegend, setActiveLegend] = React.useState<string | undefined>(
      undefined,
    );
    const [activeDot, setActiveDot] = React.useState<ActiveDot | undefined>(
      undefined,
    );
    const categoryColors = constructCategoryColors(categories, colors);

    const yAxisDomain = getYAxisDomain(autoMinValue, minValue, maxValue);
    const hasOnValueChange = !!onValueChange;
    const prevActiveRef = React.useRef<boolean | undefined>(undefined);
    const prevLabelRef = React.useRef<string | undefined>(undefined);

    function onDotClick(itemData: any, event: React.MouseEvent) {
      event.stopPropagation();

      if (!hasOnValueChange) return;

      if (
        (itemData.index === activeDot?.index &&
          itemData.dataKey === activeDot?.dataKey) ||
        (hasOnValueChange &&
          activeDot?.index === itemData.index &&
          activeDot?.dataKey === itemData.dataKey)
      ) {
        setActiveLegend(undefined);
        setActiveDot(undefined);
        onValueChange?.(null);
      } else {
        setActiveLegend(itemData.dataKey);
        setActiveDot({
          index: itemData.index,
          dataKey: itemData.dataKey,
        });
        onValueChange?.({
          eventType: "dot",
          categoryClicked: itemData.dataKey,
          ...itemData.payload,
        });
      }
    }

    function onCategoryClick(dataKey: string) {
      if (!hasOnValueChange) return;

      if (
        activeLegend &&
        activeLegend === dataKey
      ) {
        setActiveLegend(undefined);
        onValueChange?.(null);
      } else {
        setActiveLegend(dataKey);
        onValueChange?.({
          eventType: "category",
          categoryClicked: dataKey,
        });
      }
      setActiveDot(undefined);
    }

    return (
      <div
        ref={ref}
        className={cx("h-80 w-full", className)}
        tremor-id="tremor-raw"
        {...other}
      >
        <ResponsiveContainer>
          <RechartsAreaChart
            data={data}
            onClick={
              hasOnValueChange && (activeLegend || activeDot)
                ? () => {
                    setActiveDot(undefined);
                    setActiveLegend(undefined);
                    onValueChange?.(null);
                  }
                : undefined
            }
            margin={{
              bottom: xAxisLabel ? 30 : undefined,
              left: yAxisLabel ? 20 : undefined,
              right: yAxisLabel ? 5 : undefined,
            }}
            stackOffset={type === "percent" ? "expand" : undefined}
          >
            {showGridLines ? (
              <CartesianGrid
                className={cx("stroke-gray-200 dark:stroke-gray-800")}
                horizontal={true}
                vertical={false}
              />
            ) : null}

            <XAxis
              padding={{ left: paddingValue, right: paddingValue }}
              hide={!showXAxis}
              dataKey={index}
              interval={startEndOnly ? "preserveStartEnd" : intervalType}
              tick={{ transform: "translate(0, 6)" }}
              ticks={
                startEndOnly
                  ? [data[0]?.[index], data[data.length - 1]?.[index]]
                  : undefined
              }
              fill=""
              stroke=""
              className={cx(
                "text-xs",
                "fill-gray-500 dark:fill-gray-500",
              )}
              tickLine={false}
              axisLine={false}
              minTickGap={tickGap}
            >
              {xAxisLabel && (
                <Label
                  position="insideBottom"
                  offset={-20}
                  className="fill-gray-800 text-sm font-medium dark:fill-gray-200"
                >
                  {xAxisLabel}
                </Label>
              )}
            </XAxis>

            <YAxis
              width={yAxisWidth}
              hide={!showYAxis}
              axisLine={false}
              tickLine={false}
              type="number"
              domain={yAxisDomain as AxisDomain}
              tick={{ transform: "translate(-3, 0)" }}
              fill=""
              stroke=""
              className={cx(
                "text-xs",
                "fill-gray-500 dark:fill-gray-500",
              )}
              tickFormatter={
                type === "percent"
                  ? (value: number) => `${(value * 100).toString()}%`
                  : valueFormatter
              }
              allowDecimals={allowDecimals}
            >
              {yAxisLabel && (
                <Label
                  position="insideLeft"
                  style={{ textAnchor: "middle" }}
                  angle={-90}
                  offset={-15}
                  className="fill-gray-800 text-sm font-medium dark:fill-gray-200"
                >
                  {yAxisLabel}
                </Label>
              )}
            </YAxis>

            <Tooltip
              wrapperStyle={{ outline: "none" }}
              isAnimationActive={true}
              animationDuration={100}
              cursor={{ stroke: "#d1d5db", strokeWidth: 1 }}
              offset={20}
              position={{ y: 0 }}
              content={({ active, payload, label }) => {
                const cleanPayload: TooltipProps["payload"] = payload
                  ? payload.map((item: any) => ({
                      category: item.dataKey,
                      value: item.value,
                      index: item.payload[index],
                      color: categoryColors.get(
                        item.dataKey,
                      ) as AvailableChartColorsKeys,
                      type: item.type,
                      payload: item.payload,
                    }))
                  : [];

                if (
                  tooltipCallback &&
                  (active !== prevActiveRef.current ||
                    label !== prevLabelRef.current)
                ) {
                  prevActiveRef.current = active;
                  prevLabelRef.current = String(label);
                  tooltipCallback({
                    active,
                    payload: cleanPayload,
                    label: String(label ?? ""),
                  });
                }

                const labelStr = String(label ?? "");
                return showTooltip && active ? (
                  CustomTooltip ? (
                    <CustomTooltip
                      active={active}
                      payload={cleanPayload}
                      label={labelStr}
                    />
                  ) : (
                    <ChartTooltip
                      active={active}
                      payload={payload}
                      label={labelStr}
                      valueFormatter={valueFormatter}
                      categoryColors={categoryColors}
                    />
                  )
                ) : null;
              }}
            />

            {showLegend ? (
              <RechartsLegend
                verticalAlign="top"
                height={legendHeight}
                content={({ payload }) =>
                  ChartLegend(
                    { payload },
                    categoryColors,
                    setLegendHeight,
                    activeLegend,
                    hasOnValueChange
                      ? (clickedLegendItem: string) =>
                          onCategoryClick(clickedLegendItem)
                      : undefined,
                    enableLegendSlider,
                    legendPosition,
                  )
                }
              />
            ) : null}

            {categories.map((category) => {
              const categoryColor = cycleColor(category, categoryColors, colors);
              const isSingleValue = hasOnlyOneValueForKey(data, category);

              return (
                <React.Fragment key={category}>
                  <defs>
                    <linearGradient
                      className={cx(
                        getColorClassName(
                          categoryColor,
                          "text",
                        ),
                      )}
                      id={`${categoryColor}-${category.replace(/[^a-zA-Z0-9]/g, "")}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="currentColor"
                        stopOpacity={
                          activeDot || (activeLegend && activeLegend !== category)
                            ? 0.15
                            : 0.4
                        }
                      />
                      <stop
                        offset="95%"
                        stopColor="currentColor"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <Area
                    className={cx(
                      getColorClassName(
                        categoryColor,
                        "stroke",
                      ),
                    )}
                    strokeOpacity={
                      activeDot || (activeLegend && activeLegend !== category)
                        ? 0.3
                        : 1
                    }
                    activeDot={(dotProps: any) => {
                      const {
                        cx: xCoord,
                        cy: yCoord,
                        stroke,
                        strokeLinecap,
                        strokeLinejoin,
                        strokeWidth,
                        dataKey,
                      } = dotProps;

                      return (
                        <Dot
                          className={cx(
                            "stroke-white dark:stroke-gray-950",
                            onValueChange ? "cursor-pointer" : "",
                            getColorClassName(
                              categoryColor,
                              "fill",
                            ),
                          )}
                          cx={xCoord}
                          cy={yCoord}
                          r={5}
                          fill=""
                          stroke={stroke}
                          strokeLinecap={strokeLinecap}
                          strokeLinejoin={strokeLinejoin}
                          strokeWidth={strokeWidth}
                          onClick={(_, event) =>
                            onDotClick(
                              { ...dotProps, dataKey },
                              event,
                            )
                          }
                        />
                      );
                    }}
                    dot={(dotProps: any) => {
                      const {
                        stroke,
                        strokeLinecap,
                        strokeLinejoin,
                        strokeWidth,
                        cx: xCoord,
                        cy: yCoord,
                        dataKey,
                        index: dotIndex,
                      } = dotProps;

                      if (
                        (hasOnValueChange &&
                          activeDot?.index === dotIndex &&
                          activeDot?.dataKey === dataKey) ||
                        isSingleValue
                      ) {
                        return (
                          <Dot
                            key={dotIndex}
                            cx={xCoord}
                            cy={yCoord}
                            r={5}
                            stroke={stroke}
                            fill=""
                            strokeLinecap={strokeLinecap}
                            strokeLinejoin={strokeLinejoin}
                            strokeWidth={strokeWidth}
                            className={cx(
                              "stroke-white dark:stroke-gray-950",
                              onValueChange ? "cursor-pointer" : "",
                              getColorClassName(
                                categoryColor,
                                "fill",
                              ),
                            )}
                          />
                        );
                      }

                      return (
                        <Dot
                          key={dotIndex}
                          cx={xCoord}
                          cy={yCoord}
                          r={0}
                          fill="transparent"
                          stroke="transparent"
                          strokeWidth={0}
                          className=""
                        />
                      );
                    }}
                    name={category}
                    type="linear"
                    dataKey={category}
                    stroke=""
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    isAnimationActive={false}
                    connectNulls={connectNulls}
                    stackId={
                      type === "stacked" || type === "percent"
                        ? "stack"
                        : undefined
                    }
                    fill={
                      fill === "gradient"
                        ? `url(#${categoryColor}-${category.replace(/[^a-zA-Z0-9]/g, "")})`
                        : fill === "solid"
                          ? "currentColor"
                          : "transparent"
                    }
                    fillOpacity={fill === "solid" ? 0.1 : 1}
                  />

                  {isSingleValue ? (
                    <Line
                      className={cx(
                        getColorClassName(
                          categoryColor,
                          "stroke",
                        ),
                      )}
                      strokeOpacity={
                        activeDot ||
                        (activeLegend && activeLegend !== category)
                          ? 0.3
                          : 1
                      }
                      dot={false}
                      name={category}
                      type="linear"
                      dataKey={category}
                      stroke=""
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      isAnimationActive={false}
                      connectNulls={connectNulls}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}

            {onValueChange
              ? categories.map((category) => (
                  <Line
                    className={cx("cursor-pointer")}
                    strokeOpacity={0}
                    key={category}
                    name={category}
                    type="linear"
                    dataKey={category}
                    stroke="transparent"
                    fill="transparent"
                    legendType="none"
                    tooltipType="none"
                    strokeWidth={12}
                    connectNulls={connectNulls}
                    onClick={(props: any, event: React.MouseEvent) => {
                      event.stopPropagation();
                      const { name } = props;
                      onCategoryClick(name);
                    }}
                  />
                ))
              : null}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    );
  },
);

AreaChart.displayName = "AreaChart";

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function cycleColor(
  category: string,
  categoryColors: Map<string, AvailableChartColorsKeys>,
  colors: AvailableChartColorsKeys[],
): AvailableChartColorsKeys {
  return categoryColors.get(category) ?? colors[0] ?? AvailableChartColors[0];
}

function ChartLegend(
  { payload }: any,
  categoryColors: Map<string, AvailableChartColorsKeys>,
  setLegendHeight: React.Dispatch<React.SetStateAction<number>>,
  activeLegend: string | undefined,
  onClick?: (category: string, color: string) => void,
  enableLegendSlider?: boolean,
  legendPosition?: "left" | "center" | "right",
) {
  const legendRef = React.useRef<HTMLOListElement>(null);

  React.useEffect(() => {
    const calculateHeight = (height: number | undefined) => {
      const val = height ? Number(height) + 15 : 60;
      setLegendHeight(val);
    };
    calculateHeight(legendRef.current?.clientHeight);
  }, [payload, setLegendHeight]);

  const filteredPayload = (payload ?? []).filter(
    (item: any) => item.type !== "none",
  );

  const paddingLeft =
    legendPosition === "left"
      ? "justify-start"
      : legendPosition === "center"
        ? "justify-center"
        : "justify-end";

  return (
    <div
      className={cx("flex items-center", paddingLeft)}
    >
      <Legend
        ref={legendRef}
        categories={filteredPayload.map((entry: any) => entry.value)}
        colors={filteredPayload.map(
          (entry: any) =>
            categoryColors.get(entry.value) as AvailableChartColorsKeys,
        )}
        onClickLegendItem={onClick}
        activeLegend={activeLegend}
        enableLegendSlider={enableLegendSlider}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────────────────

const TremorAreaChart = AreaChart;

export { AreaChart, TremorAreaChart };
