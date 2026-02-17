/* eslint-disable @next/next/no-img-element */
"use client";

import { auth, firestore } from "@/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import React, { useEffect, useState, useMemo } from "react";

/* ------------------ Metadata ------------------ */
const ROOF_TYPES = [
  { key: "Flat", label: "Flat RCC", coeff: 0.85 },
  { key: "Sloped", label: "Sloped Roof", coeff: 0.8 },
  { key: "Asbestos", label: "Asbestos", coeff: 0.65 },
  { key: "Metal Sheet Roof", label: "Metal Sheet Roof", coeff: 0.95 },
  { key: "Bamboo Roof", label: "Bamboo Roof", coeff: 0.55 },
] as const;

const SOIL_TYPES = [
  { key: "Sandy", label: "Sandy Soil" },
  { key: "Loamy", label: "Loamy Soil" },
  { key: "Clay", label: "Clay Soil" },
  { key: "Silty", label: "Silty Soil" },
  { key: "Rocky", label: "Rocky Soil" },
] as const;

const sqftToM2 = (sqft: number) => sqft * 0.092903;

const calculateHarvest = (sqft: number, rainfall: number, runoff: number) =>
  Math.round(sqftToM2(sqft) * rainfall * runoff);

/* ------------------ Component ------------------ */
export default function RooftopForm() {
  const [user, setUser] = useState<User | null>(null);

  const [form, setForm] = useState({
    area: "",
    type: "",
    dwellers: "1",
    space: "",
    soil: "",
    runoff: "",
    sampleRainfall: 50,
  });

  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* ------------------ Load Data ------------------ */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUser(u);

      const snap = await getDoc(doc(firestore, "users", u.uid));
      if (snap.exists()) {
        const data = (snap.data() as any).rooftop || {};
        setForm({
          area: data.area || "",
          type: data.type || "",
          dwellers: data.dwellers || "1",
          space: data.space || "",
          soil: data.soil || "",
          runoff: data.runOffCoefficient || "",
          sampleRainfall: 50,
        });
      }
    });

    return () => unsub();
  }, []);

  /* ------------------ Handlers ------------------ */
  const updateField = (name: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const handleRoofType = (t: string) => {
    const meta = ROOF_TYPES.find((r) => r.key === t);
    updateField("type", t);
    updateField("runoff", meta ? String(meta.coeff) : "");
  };

  const submitForm = async () => {
    if (!user) return;
    if (!form.area || !form.type || !form.dwellers || !form.space) {
      alert("Please fill all required fields.");
      return;
    }

    setSaving(true);

    await setDoc(
      doc(firestore, "users", user.uid),
      {
        rooftop: {
          area: form.area,
          type: form.type,
          dwellers: form.dwellers,
          space: form.space,
          soil: form.soil,
          runOffCoefficient: form.runoff,
        },
      },
      { merge: true }
    );

    setSaving(false);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  /* ------------------ Computation ------------------ */
  const harvest = useMemo(() => {
    if (!form.area || !form.runoff) return 0;
    return calculateHarvest(
      Number(form.area),
      Number(form.sampleRainfall),
      Number(form.runoff)
    );
  }, [form.area, form.sampleRainfall, form.runoff]);

  /* ------------------ UI ------------------ */
  return (
    <div className="min-h-screen w-full flex items-center justify-center text-slate-50">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-7 sm:px-8 shadow-2xl backdrop-blur">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-teal-300">
              Rooftop Details
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Basic info to size your rainwater harvesting system.
            </p>
          </div>

          <div className="text-right text-xs sm:text-sm">
            <p className="text-slate-400">Rainfall (assumed)</p>
            <p className="text-base sm:text-lg font-semibold text-teal-200">
              {form.sampleRainfall} mm
            </p>
            <p className="text-slate-400 mt-1">
              Harvest estimate:{" "}
              <span className="text-teal-300 font-medium">
                {harvest.toLocaleString()} L
              </span>
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-5 text-sm">
          {/* Row 1: Area + Dwellers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-1.5">
                Rooftop Area (sq ft)*
              </label>
              <input
                value={form.area}
                onChange={(e) => updateField("area", e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 outline-none text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-500"
                placeholder="e.g. 1000"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5">
                Number of Dwellers*
              </label>
              <input
                type="number"
                min="1"
                value={form.dwellers}
                onChange={(e) => updateField("dwellers", e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 outline-none text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Row 2: Open Space + Soil */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-1.5">
                Open Space Area (sq ft)*
              </label>
              <input
                value={form.space}
                onChange={(e) => updateField("space", e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 outline-none text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-500"
                placeholder="e.g. 50"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5">
                Soil Type (optional)
              </label>
              <select
                value={form.soil}
                onChange={(e) => updateField("soil", e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 outline-none text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-500"
              >
                <option value="">Select</option>
                {SOIL_TYPES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Roof Type */}
          <div className="space-y-2">
            <label className="block text-slate-300">
              Roof Type*{" "}
              <span className="text-xs text-slate-500">(tap to select)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROOF_TYPES.map((rt) => {
                const active = form.type === rt.key;
                return (
                  <button
                    key={rt.key}
                    type="button"
                    onClick={() => handleRoofType(rt.key)}
                    className={`text-left rounded-lg px-3 py-2.5 border text-xs sm:text-sm transition
                      ${
                        active
                          ? "border-teal-400 bg-teal-600/20 text-teal-100"
                          : "border-white/10 bg-slate-900 hover:bg-slate-800 text-slate-100"
                      }`}
                  >
                    <div className="font-medium">{rt.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Runoff coeff: {rt.coeff}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={submitForm}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center rounded-lg bg-teal-600 hover:bg-teal-500 disabled:bg-teal-700/70 px-4 py-2.5 text-sm font-semibold text-white transition"
            >
              {saving ? "Saving…" : "Save Details"}
            </button>

            <button
              type="button"
              onClick={() =>
                setForm({
                  area: "",
                  type: "",
                  dwellers: "1",
                  space: "",
                  soil: "",
                  runoff: "",
                  sampleRainfall: 50,
                })
              }
              className="inline-flex items-center justify-center rounded-lg border border-white/20 px-4 py-2.5 text-sm text-slate-100 hover:bg-slate-800 transition"
            >
              Reset
            </button>
          </div>

          {submitted && (
            <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-600/10 px-3 py-2 text-xs text-emerald-200">
              ✔ Details saved successfully.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
