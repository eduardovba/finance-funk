"use client";

import React from "react";
import { CHART_COLORS } from "@/lib/chartTheme";

interface ChartTooltipPayload {
  name: string;
  value: number;
  color?: string;
  fill?: string;
  dataKey: string;
  payload?: Record<string, any>;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string | number;
  /** Format function for the label */
  labelFormatter?: (label: string | number) => string;
  /** Format function for values — receives (value, name, entry) */
  valueFormatter?: (value: number, name: string, entry: ChartTooltipPayload) => string;
  /** Optional total row at the bottom */
  totalLabel?: string;
  totalValue?: string;
}

/**
 * ChartTooltip — glass-elevated tooltip for Recharts.
 * Works with all chart types (Line, Bar, Area, Composed).
 * Uses Inter font with tabular-nums for value alignment.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  totalLabel,
  totalValue,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  // Deduplicate payload entries by name
  const uniquePayload = payload.filter(
    (v, i, a) => a.findIndex((t) => t.name === v.name) === i
  );

  const formattedLabel = labelFormatter ? labelFormatter(label ?? "") : label;

  return (
    <div
      className="glass-elevated px-4 py-3 min-w-[180px] pointer-events-none"
      style={{
        background: CHART_COLORS.tooltip.bg,
        border: `1px solid ${CHART_COLORS.tooltip.border}`,
        borderRadius: "14px",
        boxShadow: "0 16px 48px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1)",
      }}
    >
      {formattedLabel && (
        <p className="text-sm font-semibold text-[rgba(245,245,220,0.92)] mb-2 tracking-tight">
          {formattedLabel}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {uniquePayload.map((entry, index) => {
          const dotColor = entry.color || entry.fill || CHART_COLORS.primary;
          const formattedValue = valueFormatter
            ? valueFormatter(entry.value, entry.name, entry)
            : String(entry.value);

          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: dotColor }}
                />
                <span className="text-xs text-[rgba(245,245,220,0.55)] truncate">
                  {entry.name}
                </span>
              </div>
              <span
                className="text-data-xs font-medium text-[rgba(245,245,220,0.92)]  shrink-0"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formattedValue}
              </span>
            </div>
          );
        })}
      </div>

      {totalLabel && totalValue && (
        <>
          <div className="h-px bg-[rgba(212,175,55,0.15)] my-2" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[rgba(245,245,220,0.7)]">
              {totalLabel}
            </span>
            <span
              className="text-sm font-bold text-[#D4AF37]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {totalValue}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
