import { round } from "@turf/turf";
import React from "react";

interface Props {
  month: string;
  rainfall: number;
  rainCaptured: number;
  annualRainfall: number;
}

export default function RainfallStrip({
  month,
  rainfall,
  rainCaptured,
  annualRainfall,
}: Props) {
  return (
    <div className="w-full bg-gradient-to-br from-white/10 to-white/5 border border-white/20 p-3 text-white text-sm font-medium shadow-md backdrop-blur-sm">
      <div className="flex justify-between items-center mx-2">
        {/* LEFT */}
        <div className="leading-tight">
          {/* <div className="text-teal-300 text-xs">{month} Rainfall</div> */}
          <div className="text-teal-300 text-xs">2024 Rainfall</div>
          <div className="text-lg font-semibold">{annualRainfall.toFixed(2)} mm</div>

          {/* Annual rainfall */}
          <div className="text-[11px] text-white/70 mt-0.5">
            {/* Annual:{" "} */}
            {month}: {" "}
            <span className="text-white font-medium">
              {rainfall.toFixed(2)} mm
            </span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="text-right leading-tight">
          <div className="text-teal-300 text-md">Harvest Potential</div>
          <div className="text-lg font-semibold">
            {round(rainCaptured).toLocaleString()} L
          </div>
        </div>
      </div>
    </div>
  );
}
