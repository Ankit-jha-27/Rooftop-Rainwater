/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPinIcon } from "@heroicons/react/16/solid";
// If you actually use auth/firestore in this component later, keep them. For now they are left imported as you had them
import { onAuthStateChanged, updateProfile, User } from "firebase/auth";
import { auth, firestore } from "@/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import DetectArea from "./DetectArea";
import ProfileForm from "./ProfileForm";
import RoofTopDetails from "./RoofTopDetails";

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

interface FormData {
  username: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  location: {
    state: string;
    city: string;
    address: string;
  };
}

interface RoofTopFormData {
  rooftop: {
    area: string;
    type: string;
    runOffCoefficient: string;
    dwellers: string;
    space: string;
    soil: string;
  };
}

const FloatingNavbar = ({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) => (
  <div className="absolute z-50 top-5 left-140 transform -translate-x-1/2 border border-white/20 shadow-lg rounded-xl w-12/12 max-w-md flex justify-between py-3 px-4">
    <button
      onClick={() => setActiveTab("profile")}
      className={`flex-1 text-center py-2 mx-1 rounded-md font-medium transition-all cursor-pointer ${
        activeTab === "profile"
          ? "bg-teal-700 text-white shadow-md"
          : "text-white/70 hover:bg-white/10"
      }`}
    >
      Profile
    </button>
    <button
      onClick={() => setActiveTab("rooftop")}
      className={`flex-1 text-center py-2 mx-1 rounded-md font-medium transition-all cursor-pointer ${
        activeTab === "rooftop"
          ? "bg-teal-700 text-white shadow-md"
          : "text-white/70 hover:bg-white/10"
      }`}
    >
      Harvest
    </button>
    <button
      onClick={() => setActiveTab("detectRoofArea")}
      className={`flex-1 text-center py-2 mx-1 px-3 rounded-md font-medium transition-all cursor-pointer ${
        activeTab === "detectRoofArea"
          ? "bg-teal-700 text-white shadow-md"
          : "text-white/70 hover:bg-white/10"
      }`}
    >
      Detect Roof Area
    </button>
  </div>
);

const UserProfile: React.FC = () => {
  const [isDetectModalOpen, setIsDetectModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // store permission state & human-friendly error
  const [geoStatus, setGeoStatus] = useState<
    "idle" | "prompt" | "granted" | "denied" | "unsupported" | "error"
  >("idle");
  const [geoError, setGeoError] = useState<string | null>(null);

  // keep a ref to abort fetch for aquifer if unmounted
  const aquiferAbortRef = useRef<AbortController | null>(null);

  // Utility: pretty console log for debugging
  const debug = (...args: any[]) => {
    // toggle off if you want silence
    // console.debug("[UserProfile]", ...args);
    console.log("[UserProfile]", ...args);
  };

  // Robust geolocation function with permission checks and retries
  useEffect(() => {
    if (typeof window === "undefined") {
      setGeoStatus("unsupported");
      setGeoError("Not running in browser environment.");
      return;
    }

    if (!("geolocation" in navigator)) {
      setGeoStatus("unsupported");
      setGeoError("Geolocation not supported by this browser.");
      return;
    }

    let mounted = true;
    let tried = 0;
    const maxTries = 2;

    async function checkPermissionThenGet() {
      try {
        // navigator.permissions is not available in all browsers; guard it
        if ((navigator as any).permissions && typeof (navigator as any).permissions.query === "function") {
          try {
            const permissionStatus = await (navigator as any).permissions.query({ name: "geolocation" });
            debug("permission state:", permissionStatus.state);
            if (!mounted) return;
            if (permissionStatus.state === "granted") {
              setGeoStatus("granted");
              getPosition();
              return;
            }
            if (permissionStatus.state === "denied") {
              setGeoStatus("denied");
              setGeoError("Location permission denied by user or browser settings.");
              return;
            }
            // "prompt" or other -> attempt to request location
            setGeoStatus("prompt");
            getPosition();
            // also listen to future permission changes
            permissionStatus.onchange = () => {
              debug("permission changed to:", permissionStatus.state);
              if (!mounted) return;
              setGeoStatus(permissionStatus.state === "granted" ? "granted" : permissionStatus.state === "denied" ? "denied" : "prompt");
            };
            return;
          } catch (permErr) {
            // permission API might still throw on some browsers -> just continue to request
            debug("permissions API threw, continuing to getCurrentPosition:", permErr);
          }
        }
        // fallback: directly request position (will prompt)
        setGeoStatus("prompt");
        getPosition();
      } catch (err) {
        debug("checkPermissionThenGet error:", err);
        if (!mounted) return;
        setGeoStatus("error");
        setGeoError(String(err));
      }
    }

    function getPosition() {
      if (!mounted) return;
      tried++;
      // sensible options
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 12_000, // 12s
        maximumAge: 30_000, // 30s
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mounted) return;
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setGeoStatus("granted");
          setGeoError(null);
          debug("got position", pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          debug("getCurrentPosition error", err);
          if (!mounted) return;

          // Handle different error codes with transparency
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setGeoStatus("denied");
              setGeoError("Permission denied. Please allow location access in your browser settings.");
              break;
            case err.POSITION_UNAVAILABLE:
              setGeoStatus("error");
              setGeoError("Position unavailable. Ensure device has location turned on.");
              break;
            case err.TIMEOUT:
              // retry once if timed out
              if (tried < maxTries) {
                debug("timeout — retrying", tried);
                getPosition();
              } else {
                setGeoStatus("error");
                setGeoError("Location request timed out. Try again or check your device GPS.");
              }
              break;
            default:
              setGeoStatus("error");
              setGeoError(err.message || "Unknown geolocation error.");
          }
        },
        options
      );
    }

    checkPermissionThenGet();

    // Cleanup
    return () => {
      mounted = false;
    };
  }, []); // only run once

  // Fetch aquifer when lat/long become available
  useEffect(() => {
    // don't run on SSR or if coords not ready
    if (typeof window === "undefined") return;
    if (latitude === null || longitude === null) return;

    // sanity check
    if (isNaN(latitude) || isNaN(longitude)) {
      console.warn("Invalid coordinates:", latitude, longitude);
      return;
    }

    // Prevent running multiple parallel fetches
    if (aquiferAbortRef.current) {
      aquiferAbortRef.current.abort();
    }
    const ac = new AbortController();
    aquiferAbortRef.current = ac;

    async function fetchAquifer(lat: number, lon: number) {
      try {
        const signal = ac.signal;
        const res = await fetch(`/api/aquifer1?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, {
          method: "GET",
          signal,
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("Aquifer API error:", res.status, text);
          return;
        }
        const data = await res.json();
        console.log("Aquifer result:", data);
        // OPTIONAL: write aquifer to Firestore for currently logged-in user
        // (left commented — enable if you want to persist)
        /*
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userRef = doc(firestore, "users", currentUser.uid);
          await updateDoc(userRef, { aquifer: data.aquifer || null });
        }
        */
      } catch (err: any) {
        if (err?.name === "AbortError") {
          console.log("Aquifer fetch aborted (component unmount or new request).");
        } else {
          console.error("Failed to fetch aquifer:", err);
        }
      } finally {
        // clear reference
        if (aquiferAbortRef.current === ac) aquiferAbortRef.current = null;
      }
    }

    fetchAquifer(latitude, longitude);

    return () => {
      // abort if unmounting
      ac.abort();
    };
  }, [latitude, longitude]);

  return (
    <div className="flex flex-row-reverse mt-3 mb-10">
      {/* Floating Navbar */}
      <FloatingNavbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Right Side: Forms */}
      <div className="relative w-full flex flex-col ml-5 mt-23">
        {/* Show a compact status header so you can debug quickly */}
        <div className="mb-4 flex items-center gap-3 text-sm text-white/80">
          <MapPinIcon className="w-5 h-5 text-white/70" />
          <div>
            <div>
              <strong>Geo status:</strong> {geoStatus}
            </div>
            <div>
              <strong>Coords:</strong>{" "}
              {latitude !== null && longitude !== null ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : "Not detected"}
            </div>
            {geoError && <div className="text-xs text-red-300">Error: {geoError}</div>}
          </div>
        </div>

        {activeTab === "profile" && <ProfileForm />}

        {activeTab === "rooftop" && <RoofTopDetails />}

        {activeTab === "detectRoofArea" && (
          <div className="relative rounded-3xl p-6 flex flex-col items-center justify-center">
            <p className="text-white mb-4 text-center">
              Click the button below to open the roof detection tool.
            </p>
            <button
              type="button"
              onClick={() => setIsDetectModalOpen(true)}
              className="border border-blue-300 text-blue-100 hover:bg-blue-600 hover:text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:opacity-90 transition cursor-pointer"
            >
              Detect Roof Area
            </button>
          </div>
        )}
      </div>

      {/* Centered modal for DetectArea (not full screen) */}
      {isDetectModalOpen && (
        <div className="absolute inset-0 z-[2000] bg-black/60 flex items-center justify-center">
          <div
            className="relative 
                  w-[95vw] md:w-[80vw] lg:w-[70vw] 
                  h-[75vh] 
                  bg-black rounded-2xl overflow-hidden shadow-2xl
                  flex flex-col"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsDetectModalOpen(false)}
              className="absolute top-4 right-4 z-[2100] 
                 bg-white/90 text-black px-3 py-1 
                 rounded-full shadow hover:bg-white"
            >
              Close
            </button>

            {/* Content */}
            <div className="flex-1 w-full h-full">
              <DetectArea />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;