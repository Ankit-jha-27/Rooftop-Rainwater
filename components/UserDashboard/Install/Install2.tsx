/* eslint-disable @next/next/no-img-element */
import { auth, firestore } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useState } from "react";
import StatusCard from "../StatusCard";
import RecommendedProducts from "./RecommendedProducts";
import InstallType from "./InstallType2";
import StandardStatusForm from "./StandardStatusForm";
import { doc, getDoc } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import ProStatusForm from "./ProStatusForm";
import MaintenanceModernCompact from "./MaintenanceCard";
import UserOrders from "./UserOrders";

// ====================== Annual Savings Calculator ======================
const calculateAnnualSavings = (roofArea: number) => {
  const RAINFALL_MM = 800;
  const EFFICIENCY = 0.8;
  const WATER_TARIFF = 0.02;

  const annualWaterLitres = roofArea * RAINFALL_MM * EFFICIENCY;
  const annualSavings = annualWaterLitres * WATER_TARIFF;

  return Math.floor(annualSavings);
};

const InstallPage: React.FC = () => {
  const [activePlan, setActivePlan] = useState("");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  const [mode, setMode] = useState("free"); // ⭐ NEW — track user mode

  const [standardPrice, setStandardPrice] = useState<number | null>(null);
  const [proPrice, setProPrice] = useState<number | null>(null);

  const [userId, setUserId] = useState("");
  const [annualSavings, setAnnualSavings] = useState<number | null>(null);

  const slideVariants = {
    enter: {
      x: "100%", // coming from right
      opacity: 1,
    },
    center: {
      x: 0, // centered
      opacity: 1,
    },
    exit: {
      x: "-100%", // leaving left
      opacity: 0.8,
    },
  };

  const handleToggleExtra = (extra: string) => {
    setSelectedExtras((prev) =>
      prev.includes(extra)
        ? prev.filter((item) => item !== extra)
        : [...prev, extra]
    );
  };

  // Fetch rooftop details from Firebase
  useEffect(() => {
    const fetchRooftop = async () => {
      const user = auth.currentUser;
      if (!user) return;

      setUserId(user.uid);
      const ref = doc(firestore, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        const rooftop = data.rooftop;

        if (rooftop) {
          const area = parseInt(rooftop.area || "0");
          const dwellers = parseInt(rooftop.dwellers || "0");
          const space = parseInt(rooftop.space || "0");

          let baseStandard = 20000;
          let basePro = 40000;

          if (area > 500 && area <= 1000) baseStandard += 3000;
          if (area > 1000) baseStandard += 7000;

          if (area > 500 && area <= 1000) basePro += 5000;
          if (area > 1000) basePro += 10000;

          if (space < 300) {
            baseStandard += 2000;
            basePro += 3000;
          }

          if (dwellers >= 6) {
            baseStandard += 3000;
            basePro += 5000;
          }

          setStandardPrice(baseStandard);
          setProPrice(basePro);
        }
      }
    };

    fetchRooftop();
  }, []);

  // Fetch user details (status + mode + savings)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(firestore, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();

          // ⭐ NEW — read mode
          setMode(userData.mode || "free");

          // Keep older status system for compatibility
          setStatus(userData.status || "");

          const roof = userData.rooftop;
          if (roof?.area) {
            const areaNum = parseFloat(roof.area);
            const savings = calculateAnnualSavings(areaNum);
            setAnnualSavings(savings);
          }
        } else {
          console.log("No such user document!");
        }
      } else {
        setMode("free");
        setStatus("");
        setAnnualSavings(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full overflow-hidden">
      <AnimatePresence mode="wait">
        {activePlan === "standard" ? (
          <motion.div
            key="standard"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <StandardStatusForm />
          </motion.div>
        ) : activePlan == "pro" ? (
          <>
            <motion.div
              key="standard"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <ProStatusForm />
            </motion.div>
          </>
        ) : (
          <div className="relative space-y-6 p-8">
            {/* Title */}
            <h3
              className="text-3xl font-bold text-sky-300"
              id="installation-overview"
              data-tab="install"
            >
              Installation Overview
            </h3>

            {status === "inactive" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/10">
                    <h4 className="text-lg font-semibold text-sky-200 mb-3">
                      Installation Cost
                    </h4>
                    <p className="text-3xl font-bold text-white">
                      ₹ {standardPrice} – ₹ {proPrice}
                    </p>
                    <p className="text-sm text-gray-300 mt-2">
                      Based on Standard vs Pro package.
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/10">
                    <h4 className="text-lg font-semibold text-green-300 mb-3">
                      Annual Savings
                    </h4>
                    <p className="text-3xl font-bold text-green-400">
                      ₹{" "}
                      {annualSavings !== null
                        ? annualSavings
                        : "Calculating..."}
                    </p>
                    <p className="text-sm text-gray-300 mt-2">
                      Reduced water bills and recharge benefits.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              ""
            )}
            {status !== "inactive" && (
              <>
                {/* ===== OTHER STATUSES ===== */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <StatusCard status={status} setStatus={setStatus} />
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/10">
                    <h4 className="text-lg font-semibold text-green-300 mb-3">
                      Annual Savings
                    </h4>
                    <p className="text-3xl font-bold text-green-400">
                      ₹{" "}
                      {annualSavings !== null
                        ? annualSavings
                        : "Calculating..."}
                    </p>
                    <p className="text-sm text-gray-300 mt-2">
                      Reduced water bills and recharge benefits.
                    </p>
                  </div>
                </div>
              </>
            )}
            {/* ====================== CONDITIONAL UI BY MODE ====================== */}
            {["inactive", "standard"].includes(status) &&
              ["free", "standard", "pro"].includes(mode) && (
                <>
                  {/* ===== FIRST LAYOUT ===== */}

                  <InstallType
                    standardPrice={standardPrice}
                    proPrice={proPrice}
                    standardButton={
                      <>
                        <button
                          // onClick={() => activateStandardPlan()}
                          onClick={() =>
                            mode == "standard" || mode == "pro"
                              ? ""
                              : setActivePlan("standard")
                          }
                          className={`mt-6 w-full py-2 rounded-lg text-white font-semibold transition  ${
                            mode == "standard" || mode == "pro"
                              ? "bg-sky-900 cursor-not-allowed"
                              : "bg-sky-600 hover:bg-sky-700 cursor-pointer"
                          }`}
                        >
                          {["standard", "pro"].includes(mode)
                            ? "Your system is now in processing mode"
                            : "Get Standard Plan"}
                        </button>
                      </>
                    }
                    proButton={
                      <>
                        <button
                          onClick={() =>
                            ["standard"].includes(mode) &&
                            ["standard"].includes(status)
                              ? setActivePlan("pro")
                              : ""
                          }
                          className={`mt-6 w-full py-2 rounded-lg text-white font-semibold transition ${
                            ["standard"].includes(mode) &&
                            ["standard"].includes(status)
                              ? "bg-purple-600 hover:bg-purple-700 cursor-pointer"
                              : "bg-purple-900 cursor-not-allowed"
                          }`}
                        >
                          {["standard"].includes(mode) &&
                          ["standard"].includes(status)
                            ? "Switch to Pro mode"
                            : status === "standard"
                            ? "Your system is now in processing mode"
                            : "Get Pro Plan"}
                        </button>
                      </>
                    }
                  />
                </>
              )}
            {status === "standard" || status === "pro" ? (
              <MaintenanceModernCompact />
            ) : (
              ""
            )}

            {/* Recommended Products */}
            <RecommendedProducts />

            {/* ================= Additional Items ================= */}

            {status === "standard" || status === "pro" ? (
              <UserOrders userId={userId} />
            ) : (
              ""
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InstallPage;
