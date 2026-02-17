"use client";

import React, { useState, useEffect } from "react";
import { auth, firestore } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type ReportMode = "overview" | "assessment";

interface UserData {
  fullName: string;
  email: string;
  feasibility: boolean;
  location: {
    address: string;
    city: string;
    state: string;
    geopoint: number[];
  };
  geopoint: number[];
  rooftop: {
    area: string;
    dwellers: string;
    runOffCoefficient: string;
    soil: string;
    space: string;
    type: string;
    status: string;
  };
  avgRainfall_mm?: number;
  gwScore?: number;
  openSpaceScore?: number;
  rainfallScore?: number;
  roofScore?: number;
  soilScore?: number;
  category?: string;

  feasibilityScore?: number;
  explanation?: string;
  generatedAtISO?: string;

  litres_per_year?: number;

  costBenefit?: {
    annualMaintenance_INR?: number;
    annualWaterBillSavings_INR?: number;
    expectedLifespan_years?: number;
    installationCost_INR?: number;
    netUpfrontCostAfterSubsidy_INR?: number;
    paybackPeriod_years?: number;
    roi10yr_multiple?: number;
    subsidyAmount_INR?: number;
    subsidyEligible?: boolean;
    subsidyRate_fraction?: number;
  };

  environmentalImpact?: {
    co2Saved_kg_per_year?: number;
    descriptionBullets?: string[];
    energySaved_kWh_per_year?: number;
    groundwaterDependencyReduction_pct?: number;
    groundwaterRecharge_litres_per_year?: number;
    householdsEquivalentWaterServed?: number;
    perCapitaWaterSaved_litres_per_year?: number;
    sustainabilityRating?: string;
    tankerTripsAvoided_per_year?: number;
  };

  recommendedDimensions?: {
    pit?: {
      depth_m?: number;
      diameter_m?: number;
      volume_m3?: number;
    };
    trench?: {
      depth_m?: number;
      length_m?: number;
      width_m?: number;
    };
  };

  recommendedStructures?: {
    confidence?: number;
    reason?: string;
    type?: string;
  }[];
}

const PDFReport: React.FC = () => {
  const [mode, setMode] = useState<ReportMode>("overview");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(firestore, "users", user.uid);
          const userSnap = await getDoc(userRef);

          const reportRef = doc(firestore, "reports", user.uid);
          const reportSnap = await getDoc(reportRef);

          if (userSnap.exists()) {
            const baseData = userSnap.data() as UserData;
            const reportData = reportSnap.exists()
              ? (reportSnap.data() as Partial<UserData>)
              : {};

            setUserData({
              ...baseData,
              ...reportData,
            });
          } else if (reportSnap.exists()) {
            setUserData(reportSnap.data() as UserData);
          } else {
            setUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user/report data:", error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // const handleDownload = async () => {
  //   const html2pdf = (await import("html2pdf.js")).default;

  //   const element = document.querySelector("#report") as HTMLElement | null;
  //   if (!element) return;

  //   html2pdf(element, {
  //     margin: 10,
  //     filename:
  //       mode === "overview"
  //         ? "rooftop_overview_report.pdf"
  //         : "rwh_assessment_report.pdf",
  //     image: { type: "jpeg", quality: 0.98 },
  //     html2canvas: { scale: 2 },
  //     jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  //   });
  // };

  const handleDownload = async () => {
    const html2pdf = (await import("html2pdf.js")).default;
    const element = document.getElementById("report-content");
    if (!element) return;

    html2pdf()
      .from(element)
      .set({
        margin: 10,
        filename:
          mode === "overview"
            ? "rooftop_overview_report.pdf"
            : "rwh_assessment_report.pdf",
        html2canvas: {
          scale: 2,
          useCORS: true,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
      })
      .save();
  };

  const renderHeaderTitle = () => {
    switch (mode) {
      case "overview":
        return "Rooftop Overview Report";
      case "assessment":
        return "Rainwater Assessment Report";
      default:
        return "Site Report";
    }
  };

  const renderHeaderSubtitle = () => {
    switch (mode) {
      case "overview":
        return "High-level summary of your rooftop and site conditions";
      case "assessment":
        return "Technical sizing and feasibility of rainwater harvesting system";
      default:
        return "";
    }
  };

  const renderOverviewContent = () => {
    if (loading) return <div className="text-center p-10">Loading data...</div>;
    if (!userData)
      return <div className="text-center p-10">No user data found.</div>;

    return (
      <>
        <section id="report">
          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center gap-2">
              <span>👤</span> <span>User Details</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="text-gray-500">Full Name</p>
                <p className="font-semibold text-lg">{userData.fullName}</p>
              </div>
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="text-gray-500">Email</p>
                <p className="font-semibold text-lg break-all">
                  {userData.email}
                </p>
              </div>
            </div>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center gap-2">
              <span>🏠</span> <span>Property Overview</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="text-gray-500">Rooftop Area</p>
                <p className="font-semibold text-lg">
                  {userData.rooftop.area} sq.ft
                </p>
              </div>
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="text-gray-500">Rooftop Type</p>
                <p className="font-semibold text-lg">{userData.rooftop.type}</p>
              </div>
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="text-gray-500">Number of Dwellers</p>
                <p className="font-semibold text-lg">
                  {userData.rooftop.dwellers} People
                </p>
              </div>
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="text-gray-500">Open Space Available</p>
                <p className="font-semibold text-lg">
                  {userData.rooftop.space} sq.ft
                </p>
              </div>
            </div>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center gap-2">
              <span>📍</span> <span>Location Details</span>
            </h2>
            <div className="border p-4 rounded-lg bg-gray-50 mb-4 text-sm">
              <p className="text-gray-500">Address</p>
              <p className="font-medium text-base">
                {userData.location.address}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="text-gray-500">City / State</p>
                <p className="font-semibold text-lg">
                  {userData.location.city}, {userData.location.state}
                </p>
              </div>
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="text-gray-500">Coordinates</p>
                <p className="font-semibold text-lg">
                  {userData.geopoint?.[0]?.toFixed(4)}° N,{" "}
                  {userData.geopoint?.[1]?.toFixed(4)}° E
                </p>
              </div>
            </div>
          </section>
        </section>
        <button
          onClick={handleDownload}
          className="inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/30 transition"
        >
          ⬇️ Download PDF
        </button>
      </>
    );
  };

  const renderAssessmentContent = () => {
    if (loading) {
      return <div className="text-center p-10 text-sm">Loading data...</div>;
    }
    if (!userData) {
      return (
        <div className="text-center p-10 text-sm">No user data found.</div>
      );
    }

    const {
      feasibilityScore,
      category,
      avgRainfall_mm,
      gwScore,
      openSpaceScore,
      rainfallScore,
      roofScore,
      soilScore,
      explanation,
      generatedAtISO,
      litres_per_year,
      costBenefit,
      environmentalImpact,
      recommendedDimensions,
      recommendedStructures,
    } = userData;

    return (
      <>
        {/* Feasibility summary */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center gap-2">
            <span>✔️</span> <span>Feasibility Summary</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
            <div className="border p-4 rounded-lg bg-gray-50">
              <p className="text-gray-500">Overall Feasibility Score</p>
              <p className="font-semibold text-2xl">
                {feasibilityScore ?? "--"}/100
              </p>
            </div>
            <div className="border p-4 rounded-lg bg-gray-50">
              <p className="text-gray-500">Category</p>
              <p className="font-semibold text-lg">
                {category ?? "Not classified"}
              </p>
            </div>
            <div className="border p-4 rounded-lg bg-gray-50">
              <p className="text-gray-500">Average Annual Rainfall</p>
              <p className="font-semibold text-lg">
                {avgRainfall_mm != null ? `${avgRainfall_mm} mm` : "--"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
            <div className="border p-4 rounded-lg bg-gray-50">
              <p className="text-gray-500">Harvestable Water</p>
              <p className="font-semibold text-lg">
                {litres_per_year != null
                  ? `${litres_per_year.toLocaleString()} L/yr`
                  : "--"}
              </p>
            </div>
            <div className="border p-4 rounded-lg bg-gray-50">
              <p className="text-gray-500">Generated At</p>
              <p className="font-semibold text-xs">
                {generatedAtISO
                  ? new Date(generatedAtISO).toLocaleString()
                  : "--"}
              </p>
            </div>
          </div>
          {explanation && (
            <div className="border p-4 rounded-lg bg-blue-50 text-sm">
              <p className="text-gray-500 mb-1">AI Explanation</p>
              <p className="text-gray-800">{explanation}</p>
            </div>
          )}
        </section>
        {/* Detailed scores */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center gap-2">
            <span>📊</span> <span>Score Breakdown</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="border p-4 rounded-lg bg-gray-50">
              <p className="text-gray-500">Groundwater Score</p>
              <p className="font-semibold text-lg">
                {userData.breakdown.gwScore != null
                  ? `${userData.breakdown.gwScore}/100`
                  : "--"}
              </p>
            </div>
            <div className="border p-4 rounded-lg bg-gray-50">
              <p className="text-gray-500">Open Space Score</p>
              <p className="font-semibold text-lg">
                {userData.breakdown.openSpaceScore != null
                  ? `${userData.breakdown.openSpaceScore}/100`
                  : "--"}
              </p>
            </div>
            <div className="border p-4 rounded-lg bg-gray-50">
              <p className="text-gray-500">Rainfall Score</p>
              <p className="font-semibold text-lg">
                {userData.breakdown.rainfallScore != null
                  ? `${userData.breakdown.rainfallScore}/100`
                  : "--"}
              </p>
            </div>
            <div className="border p-4 rounded-lg bg-gray-50">
              <p className="text-gray-500">Roof Score</p>
              <p className="font-semibold text-lg">
                {userData.breakdown.roofScore != null
                  ? `${userData.breakdown.roofScore}/100`
                  : "--"}
              </p>
            </div>
            <div className="border p-4 rounded-lg bg-gray-50">
              <p className="text-gray-500">Soil Score</p>
              <p className="font-semibold text-lg">
                {userData.breakdown.soilScore != null
                  ? `${userData.breakdown.soilScore}/100`
                  : "--"}
              </p>
            </div>
          </div>
        </section>

        {/* Cost benefit */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center gap-2">
            <span>💰</span> <span>Cost–Benefit Analysis</span>
          </h2>
          {costBenefit ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="text-gray-500">Installation Cost</p>
                <p className="font-semibold text-lg">
                  {costBenefit.installationCost_INR != null
                    ? `₹${Math.round(
                        costBenefit.installationCost_INR
                      ).toLocaleString()}`
                    : "--"}
                </p>
              </div>
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="text-gray-500">Net Upfront (After Subsidy)</p>
                <p className="font-semibold text-lg">
                  {costBenefit.netUpfrontCostAfterSubsidy_INR != null
                    ? `₹${Math.round(
                        costBenefit.netUpfrontCostAfterSubsidy_INR
                      ).toLocaleString()}`
                    : "--"}
                </p>
              </div>
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="text-gray-500">Annual Maintenance</p>
                <p className="font-semibold text-lg">
                  {costBenefit.annualMaintenance_INR != null
                    ? `₹${Math.round(
                        costBenefit.annualMaintenance_INR
                      ).toLocaleString()}/yr`
                    : "--"}
                </p>
              </div>
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="text-gray-500">Annual Water Bill Savings</p>
                <p className="font-semibold text-lg">
                  {costBenefit.annualWaterBillSavings_INR != null
                    ? `₹${Math.round(
                        costBenefit.annualWaterBillSavings_INR
                      ).toLocaleString()}/yr`
                    : "--"}
                </p>
              </div>
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="text-gray-500">Payback Period</p>
                <p className="font-semibold text-lg">
                  {costBenefit.paybackPeriod_years != null
                    ? `${costBenefit.paybackPeriod_years.toFixed(1)} years`
                    : "--"}
                </p>
              </div>
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="text-gray-500">10-year ROI</p>
                <p className="font-semibold text-lg">
                  {costBenefit.roi10yr_multiple != null
                    ? `${costBenefit.roi10yr_multiple.toFixed(2)}x`
                    : "--"}
                </p>
              </div>
              <div className="border p-4 rounded-lg bg-green-50">
                <p className="text-gray-500">Subsidy Eligible</p>
                <p className="font-semibold text-lg">
                  {costBenefit.subsidyEligible === true
                    ? "Yes"
                    : costBenefit.subsidyEligible === false
                    ? "No"
                    : "--"}
                </p>
              </div>
              <div className="border p-4 rounded-lg bg-green-50">
                <p className="text-gray-500">Subsidy Amount</p>
                <p className="font-semibold text-lg">
                  {costBenefit.subsidyAmount_INR != null
                    ? `₹${Math.round(
                        costBenefit.subsidyAmount_INR
                      ).toLocaleString()}`
                    : "--"}
                </p>
              </div>
              <div className="border p-4 rounded-lg bg-green-50">
                <p className="text-gray-500">Subsidy Rate</p>
                <p className="font-semibold text-lg">
                  {costBenefit.subsidyRate_fraction != null
                    ? `${(costBenefit.subsidyRate_fraction * 100).toFixed(0)}%`
                    : "--"}
                </p>
              </div>
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="text-gray-500">Expected Lifespan</p>
                <p className="font-semibold text-lg">
                  {costBenefit.expectedLifespan_years != null
                    ? `${costBenefit.expectedLifespan_years} years`
                    : "--"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No cost–benefit data available.
            </p>
          )}
        </section>

        {/* Environmental impact */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center gap-2">
            <span>🌍</span> <span>Environmental Impact</span>
          </h2>
          {environmentalImpact ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                <div className="border p-4 rounded-lg bg-gray-50">
                  <p className="text-gray-500">CO₂ Saved</p>
                  <p className="font-semibold text-lg">
                    {environmentalImpact.co2Saved_kg_per_year != null
                      ? `${environmentalImpact.co2Saved_kg_per_year} kg/yr`
                      : "--"}
                  </p>
                </div>
                <div className="border p-4 rounded-lg bg-gray-50">
                  <p className="text-gray-500">Water Saved</p>
                  <p className="font-semibold text-lg">
                    {environmentalImpact.perCapitaWaterSaved_litres_per_year !=
                    null
                      ? `${environmentalImpact.perCapitaWaterSaved_litres_per_year} L/person/yr`
                      : "--"}
                  </p>
                </div>
                <div className="border p-4 rounded-lg bg-gray-50">
                  <p className="text-gray-500">Tanker Trips Avoided</p>
                  <p className="font-semibold text-lg">
                    {environmentalImpact.tankerTripsAvoided_per_year != null
                      ? `${environmentalImpact.tankerTripsAvoided_per_year}/yr`
                      : "--"}
                  </p>
                </div>
                <div className="border p-4 rounded-lg bg-gray-50">
                  <p className="text-gray-500">Energy Saved</p>
                  <p className="font-semibold text-lg">
                    {environmentalImpact.energySaved_kWh_per_year != null
                      ? `${environmentalImpact.energySaved_kWh_per_year} kWh/yr`
                      : "--"}
                  </p>
                </div>
                <div className="border p-4 rounded-lg bg-gray-50">
                  <p className="text-gray-500">Groundwater Recharge</p>
                  <p className="font-semibold text-lg">
                    {environmentalImpact.groundwaterRecharge_litres_per_year !=
                    null
                      ? `${environmentalImpact.groundwaterRecharge_litres_per_year.toLocaleString()} L/yr`
                      : "--"}
                  </p>
                </div>
                <div className="border p-4 rounded-lg bg-gray-50">
                  <p className="text-gray-500">GW Dependency Reduction</p>
                  <p className="font-semibold text-lg">
                    {environmentalImpact.groundwaterDependencyReduction_pct !=
                    null
                      ? `${environmentalImpact.groundwaterDependencyReduction_pct}%`
                      : "--"}
                  </p>
                </div>
                <div className="border p-4 rounded-lg bg-gray-50">
                  <p className="text-gray-500">Households Equivalent Served</p>
                  <p className="font-semibold text-lg">
                    {environmentalImpact.householdsEquivalentWaterServed != null
                      ? environmentalImpact.householdsEquivalentWaterServed
                      : "--"}
                  </p>
                </div>
                <div className="border p-4 rounded-lg bg-gray-50">
                  <p className="text-gray-500">Sustainability Rating</p>
                  <p className="font-semibold text-lg">
                    {environmentalImpact.sustainabilityRating ?? "--"}
                  </p>
                </div>
              </div>
              {environmentalImpact.descriptionBullets &&
                environmentalImpact.descriptionBullets.length > 0 && (
                  <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
                    {environmentalImpact.descriptionBullets.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
            </>
          ) : (
            <p className="text-sm text-gray-500">
              No environmental impact data available.
            </p>
          )}
        </section>

        {/* Recommended dimensions */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center gap-2">
            <span>📐</span> <span>Recommended Dimensions</span>
          </h2>
          {recommendedDimensions ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="font-semibold mb-2">Recharge Pit</p>
                <p className="text-gray-500">
                  Depth:{" "}
                  <span className="font-semibold">
                    {recommendedDimensions.pit?.depth_m != null
                      ? `${recommendedDimensions.pit.depth_m} m`
                      : "--"}
                  </span>
                </p>
                <p className="text-gray-500">
                  Diameter:{" "}
                  <span className="font-semibold">
                    {recommendedDimensions.pit?.diameter_m != null
                      ? `${recommendedDimensions.pit.diameter_m} m`
                      : "--"}
                  </span>
                </p>
                <p className="text-gray-500">
                  Volume:{" "}
                  <span className="font-semibold">
                    {recommendedDimensions.pit?.volume_m3 != null
                      ? `${recommendedDimensions.pit.volume_m3} m³`
                      : "--"}
                  </span>
                </p>
              </div>
              <div className="border p-4 rounded-lg bg-gray-50">
                <p className="font-semibold mb-2">Recharge Trench</p>
                <p className="text-gray-500">
                  Depth:{" "}
                  <span className="font-semibold">
                    {recommendedDimensions.trench?.depth_m != null
                      ? `${recommendedDimensions.trench.depth_m} m`
                      : "--"}
                  </span>
                </p>
                <p className="text-gray-500">
                  Length:{" "}
                  <span className="font-semibold">
                    {recommendedDimensions.trench?.length_m != null
                      ? `${recommendedDimensions.trench.length_m} m`
                      : "--"}
                  </span>
                </p>
                <p className="text-gray-500">
                  Width:{" "}
                  <span className="font-semibold">
                    {recommendedDimensions.trench?.width_m != null
                      ? `${recommendedDimensions.trench.width_m} m`
                      : "--"}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No sizing data available.</p>
          )}
        </section>

        {/* Recommended structures */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center gap-2">
            <span>🏗️</span> <span>Recommended Structures</span>
          </h2>
          {recommendedStructures && recommendedStructures.length > 0 ? (
            <div className="space-y-3 text-sm">
              {recommendedStructures.map((s, idx) => (
                <div
                  key={idx}
                  className="border p-4 rounded-lg bg-gray-50 flex flex-col gap-1"
                >
                  <p className="font-semibold">
                    {s.type ?? "Structure"}{" "}
                    {s.confidence != null && (
                      <span className="text-xs text-gray-500">
                        (confidence {(s.confidence * 100).toFixed(0)}%)
                      </span>
                    )}
                  </p>
                  {s.reason && (
                    <p className="text-gray-700">
                      Reason: <span className="font-normal">{s.reason}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No structure recommendations available.
            </p>
          )}
        </section>
      </>
    );
  };

  const renderContent = () => {
    if (mode === "overview") return renderOverviewContent();
    return renderAssessmentContent();
  };

  return (
    <>
      {/* Styles that improve print / PDF appearance */}
      <style jsx global>{`
        /* Ensure the report uses the full A4 width for html2pdf.js */
        #report {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
            sans-serif;
        }

        /* White background for PDF */
        #report {
          background-color: #ffffff !important;
        }

        /* Hide app background when printing (for safety if user prints directly) */
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: #ffffff !important;
          }
          /* Only show the report when printing */
          body > *:not(#__next),
          #__next > *:not(.pdf-report-root) {
            display: none !important;
          }
          #report {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      <div className="pdf-report-root min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-black py-10 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">
                Smart Rainwater Report Center
              </h1>
              <p className="text-sm text-slate-300">
                Choose what you want to generate: rooftop overview or
                assessment.
              </p>
            </div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-2 flex flex-col gap-2">
            <p className="text-xs text-slate-300 px-1">Select report type</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button
                onClick={() => setMode("overview")}
                className={`rounded-xl px-4 py-3 text-sm text-left transition border ${
                  mode === "overview"
                    ? "bg-white text-slate-900 border-white shadow-lg"
                    : "bg-slate-900/60 text-slate-200 border-slate-700 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>🏠</span>
                  <span className="font-semibold">Rooftop Overview</span>
                </div>
                <p className="text-xs text-slate-400">
                  Basic property, location & groundwater snapshot.
                </p>
              </button>
              <button
                onClick={() => setMode("assessment")}
                className={`rounded-xl px-4 py-3 text-sm text-left transition border ${
                  mode === "assessment"
                    ? "bg-white text-slate-900 border-white shadow-lg"
                    : "bg-slate-900/60 text-slate-200 border-slate-700 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>📊</span>
                  <span className="font-semibold">Assessment</span>
                </div>
                <p className="text-xs text-slate-400">
                  Feasibility, sizing, and recommended components.
                </p>
              </button>
            </div>
          </div>
          <div
            // id="report"
            className="bg-white rounded-2xl shadow-2xl p-10 max-w-4xl mx-auto space-y-8"
          >
            <header className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-slate-900">
                {renderHeaderTitle()}
              </h2>
              <p className="text-xs text-gray-500">
                Generated by Smart Rainwater Management System
              </p>
              <p className="text-xs text-gray-400">
                Mode: {mode === "overview" ? "Rooftop Overview" : "Assessment"}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {renderHeaderSubtitle()}
              </p>
            </header>
            <div className="space-y-8">{renderContent()}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PDFReport;
