import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { BarPoint, Fill } from "@/types";

type ChartHandle = {
  chart: IChartApi;
  series: ISeriesApi<"Candlestick">;
  markers: ISeriesMarkersPluginApi<Time>;
};

function markersFor(fills: Fill[]): SeriesMarker<Time>[] {
  const grouped = new Map<number, Fill[]>();
  for (const fill of fills) {
    const list = grouped.get(fill.time) ?? [];
    list.push(fill);
    grouped.set(fill.time, list);
  }
  return [...grouped.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([time, group]) => {
      const last = group[group.length - 1]!;
      const buy = last.side === "BUY";
      const flip = new Set(group.map((fill) => fill.side)).size > 1;
      return {
        time: time as UTCTimestamp,
        position: buy ? "belowBar" : "aboveBar",
        shape: buy ? "arrowUp" : "arrowDown",
        color: buy ? "#15803d" : "#b91c1c",
        text: flip ? (buy ? "Buy flip" : "Sell flip") : buy ? "Buy" : "Sell",
      };
    });
}

export function PriceChart({ bars, fills }: { bars: BarPoint[]; fills: Fill[] }) {
  const container = useRef<HTMLDivElement>(null);
  const handle = useRef<ChartHandle | null>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const chart = createChart(element, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#3f3f46",
        fontFamily: "Geist Variable, ui-sans-serif, sans-serif",
      },
      grid: {
        vertLines: { color: "#f4f4f5" },
        horzLines: { color: "#f4f4f5" },
      },
      rightPriceScale: { borderColor: "#e4e4e7" },
      timeScale: { borderColor: "#e4e4e7", timeVisible: true, secondsVisible: false },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#15803d",
      downColor: "#b91c1c",
      borderVisible: false,
      wickUpColor: "#15803d",
      wickDownColor: "#b91c1c",
      priceFormat: { type: "price", precision: 5, minMove: 0.00001 },
    });
    const markers = createSeriesMarkers(series);
    handle.current = { chart, series, markers };
    return () => {
      chart.remove();
      handle.current = null;
    };
  }, []);

  useEffect(() => {
    const api = handle.current;
    if (!api || bars.length === 0) return;
    api.series.setData(
      bars.map((bar) => ({
        time: bar.time as UTCTimestamp,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      })),
    );
    api.markers.setMarkers(markersFor(fills));
    api.chart.timeScale().fitContent();
  }, [bars, fills]);

  return <div ref={container} className="h-80 w-full" />;
}
