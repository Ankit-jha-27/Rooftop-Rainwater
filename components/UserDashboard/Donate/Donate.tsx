"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  DocumentData,
  Unsubscribe,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { auth, firestore } from "@/firebase";
import { Droplet, ArrowRight, MapPin, Award, Flame, Phone } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";

/* -------------------------------
   TYPE DEFINITIONS
-------------------------------- */
type NGO = {
  id: string;
  name: string;
  regNumber?: string;
  regFileUrl?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  state?: string;
  cities?: string;
  serviceAreas?: string[];
  website?: string;
  upi?: string;
  about?: string;
  status?: string;
  createdAt?: any;
};

type RequestItem = {
  id: string;
  amount?: number;
  unit?: "L" | "KL";
  requiredLiters?: number;
  location?: string;
  urgency?: "low" | "medium" | "high";
  notes?: string;
  status?: string;
  createdAt?: any;
};

type DonorUser = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: { address?: string; lat?: number; lng?: number };
};

/* -------------------------------
   COMPONENT START
-------------------------------- */
export default function DonorPage(): JSX.Element {
  /* ----------------------------------------
     LOCAL USER (Replace with Firebase Auth)
  ----------------------------------------- */
  const user: DonorUser = useMemo(
    () => ({
      id: "USER_001", // In real usage -> auth.currentUser.uid
      name: "Akash Donor",
      email: "akash@example.com",
      phone: "9876543210",
      location: { address: "Kolkata, West Bengal", lat: 22.57, lng: 88.36 },
    }),
    []
  );

  const [uid, setUid] = useState("");
  /* ----------------------------------------
     LOCAL DONOR TANK + DONATION AMOUNT
  ----------------------------------------- */
  const [tankLiters, setTankLiters] = useState<number>(1200);
  const [donateAmount, setDonateAmount] = useState<number>(50);

  /* ----------------------------------------
     REWARD POINTS (1L = 1 point)
  ----------------------------------------- */
  const [reward, setReward] = useState<number>(0);

  // Fetch and listen to reward in Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      try {
        setUid(user.uid);
        const userRef = doc(firestore, "users", user.uid);
  
        const unsub = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setReward(snap.data().reward || 0);
          } else {
            // initialize reward if not present
            setDoc(userRef, { reward: 0 }, { merge: true });
          }
        });
        return () => unsub();
      } catch (e) {
        console.log(e);
      }
    });

    return () => unsubscribe();
  }, [user.id]);

  /* ----------------------------------------
     LOAD NGOs + REQUESTS IN REALTIME
  ----------------------------------------- */
  const [ngos, setNgos] = useState<NGO[]>([]);
  const requestsMapRef = useRef<Record<string, RequestItem[]>>({});
  const [requestsMapVersion, setRequestsMapVersion] = useState<number>(0);
  const [donateLoading, setDonateLoading] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    const ngosRef = collection(firestore, "ngos");

    const unsubNgos = onSnapshot(ngosRef, (snap) => {
      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as DocumentData),
      }));
      setNgos(list);
    });

    /* Build request listeners dynamically */
    const reqUnsubs = new Map<string, Unsubscribe>();

    const rebuild = (docs: NGO[]) => {
      const ids = new Set(docs.map((x) => x.id));

      // Remove old listeners
      for (const [id, un] of reqUnsubs.entries()) {
        if (!ids.has(id)) {
          un();
          reqUnsubs.delete(id);
          delete requestsMapRef.current[id];
        }
      }

      // Add listeners for new NGOs
      docs.forEach((ngo) => {
        if (reqUnsubs.has(ngo.id)) return;

        const ref = query(
          collection(firestore, "ngos", ngo.id, "requests"),
          orderBy("createdAt", "desc")
        );

        const un = onSnapshot(ref, (snap) => {
          requestsMapRef.current[ngo.id] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as DocumentData),
          }));

          setRequestsMapVersion((v) => v + 1);
        });

        reqUnsubs.set(ngo.id, un);
      });
    };

    // Initial build
    (async () => {
      const initial = await import("firebase/firestore").then(({ getDocs }) =>
        getDocs(ngosRef)
      );
      rebuild(
        initial.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) }))
      );
    })();

    // Rebuild on NGO update
    const unsubRebuild = onSnapshot(ngosRef, (snap) => {
      rebuild(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) }))
      );
    });

    return () => {
      unsubNgos();
      unsubRebuild();
      for (const un of reqUnsubs.values()) un();
    };
  }, []);

  /* ----------------------------------------
     FLATTENED REQUEST LIST (With NGO Names)
  ----------------------------------------- */
  const requests = useMemo(() => {
    const out: (RequestItem & { ngoId: string; ngoName?: string })[] = [];

    for (const ngo of ngos) {
      const reqs = requestsMapRef.current[ngo.id] || [];
      reqs.forEach((r) => out.push({ ...r, ngoId: ngo.id, ngoName: ngo.name }));
    }

    return out.sort((a, b) => {
      const A = a.createdAt?.toMillis?.() || 0;
      const B = b.createdAt?.toMillis?.() || 0;
      return B - A;
    });
  }, [ngos, requestsMapVersion]);

  /* ----------------------------------------
     DONATE FUNCTION — WITH REWARD SYSTEM
  ----------------------------------------- */
  const donateToNGO = async (ngoId: string, reqId: string) => {
    const key = `${ngoId}:${reqId}`;

    if (donateAmount <= 0) return alert("Enter valid amount");
    if (donateAmount > tankLiters) return alert("Not enough harvested water!");

    try {
      setDonateLoading((x) => ({ ...x, [key]: true }));

      // 1) Add donation under request
      await addDoc(
        collection(firestore, "ngos", ngoId, "requests", reqId, "donors"),
        {
          donorId: user.id,
          donorName: user.name,
          donorEmail: user.email,
          donorPhone: user.phone,
          litersDonated: donateAmount,
          donatedAt: serverTimestamp(),
        }
      );

      // 2) Add/update donor record under NGO
      await addDoc(collection(firestore, "ngos", ngoId, "donors"), {
        donorId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        donatedLiters: donateAmount,
        lastDonatedAt: serverTimestamp(),
      });

      // 3) Reduce tank
      setTankLiters((t) => t - donateAmount);

      // 4) UPDATE REWARD POINTS (1L = 1 POINT)
      const userRef = doc(firestore, "users", uid);
      const userSnap = await getDoc(userRef);
      const oldReward = userSnap.exists() ? userSnap.data().reward || 0 : 0;

      await setDoc(
        userRef,
        { reward: oldReward + donateAmount },
        { merge: true }
      );

      setReward((prev) => prev + donateAmount);

      alert(`You donated ${donateAmount}L and earned ${donateAmount} pts!`);
    } catch (e) {
      console.error(e);
      alert("Donation failed.");
    } finally {
      setDonateLoading((x) => ({ ...x, [key]: false }));
    }
  };

  /* ----------------------------------------
     URGENCY PILL
  ----------------------------------------- */
  const UrgencyPill = ({ u }: { u?: RequestItem["urgency"] }) => {
    if (!u) return null;

    const styles =
      u === "high"
        ? "bg-red-600/20 text-red-300"
        : u === "medium"
        ? "bg-amber-600/20 text-amber-300"
        : "bg-emerald-600/20 text-emerald-300";

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${styles}`}>
        {u}
      </span>
    );
  };

  /* ----------------------------------------
     FINAL UI
  ----------------------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---------------------------------------- */}
        {/* LEFT SIDE — NGO + REQUEST CARDS         */}
        {/* ---------------------------------------- */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Droplet className="text-sky-400" /> Active Requests
            </h1>
            <p className="text-sm text-slate-400">
              Tank:{" "}
              <span className="text-emerald-300 font-bold">{tankLiters} L</span>
            </p>
          </div>

          {ngos.map((ngo) => {
            const reqs = requestsMapRef.current[ngo.id] || [];
            const active = reqs.filter(
              (r) => !r.status || r.status === "pending"
            );

            return (
              <div
                key={ngo.id}
                className="bg-slate-800 p-5 rounded-xl border border-white/10"
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold">
                    {ngo.name?.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <h2 className="text-lg font-bold">{ngo.name}</h2>
                        <p className="text-xs text-slate-500">
                          ID: <span className="font-mono">{ngo.id}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">State</p>
                        <p className="font-semibold">{ngo.state || "—"}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2 flex-wrap">
                      {(ngo.serviceAreas || []).slice(0, 6).map((s, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 bg-white/5 rounded-md"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {ngo.about && (
                      <p className="mt-3 text-sm text-slate-300">{ngo.about}</p>
                    )}

                    {/* Requests */}
                    <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
                      {active.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          No active requests.
                        </p>
                      ) : (
                        active.map((req) => {
                          const key = `${ngo.id}:${req.id}`;
                          return (
                            <div
                              key={req.id}
                              className="p-3 bg-slate-900 rounded-lg flex justify-between items-center"
                            >
                              <div>
                                <div className="flex gap-2 items-center">
                                  <p className="text-sm font-semibold">
                                    {req.location}
                                  </p>
                                  <UrgencyPill u={req.urgency} />
                                </div>

                                <p className="text-xs text-slate-400 mt-1">
                                  Needs{" "}
                                  <span className="text-sky-300 font-bold">
                                    {req.requiredLiters ?? 0} L
                                  </span>
                                </p>
                              </div>

                              <button
                                disabled={donateLoading[key]}
                                onClick={() => donateToNGO(ngo.id, req.id)}
                                className="px-3 py-2 bg-sky-600 rounded-lg font-semibold flex items-center gap-2 hover:bg-sky-500 disabled:opacity-50"
                              >
                                {donateLoading[key] ? "..." : "Donate"}
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ---------------------------------------- */}
        {/* RIGHT SIDE — TANK, SLIDER, REWARDS       */}
        {/* ---------------------------------------- */}
        <aside className="bg-slate-800 p-6 rounded-xl border border-white/10">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Flame className="text-orange-400" /> Your Tank
          </h2>

          <div className="mt-4 bg-slate-900 p-4 rounded-lg border border-white/5">
            <p className="text-xs text-slate-400">Available Water</p>
            <p className="text-3xl font-bold text-emerald-400">
              {tankLiters} L
            </p>
          </div>

          {/* SLIDER */}
          <div className="mt-6">
            <label className="text-xs text-slate-400">
              Select water to donate
            </label>
            <input
              type="range"
              min={1}
              max={tankLiters}
              value={donateAmount}
              onChange={(e) => setDonateAmount(Number(e.target.value))}
              className="w-full mt-2"
            />

            <p className="text-center text-lg mt-2 text-sky-300 font-semibold">
              {donateAmount} L
            </p>
          </div>

          {/* REWARD CARD */}
          {/* <div className="mt-6 bg-slate-900 p-4 rounded-xl border border-white/5">
            <h4 className="font-semibold mb-1 flex items-center gap-2">
              <Award className="text-yellow-400" /> Reward Points
            </h4>
            <p className="text-3xl font-bold text-yellow-300">{reward} pts</p>
            <p className="text-xs text-slate-500 mt-1">
              1 liter donated = 1 point earned.
            </p>
          </div> */}

          {/* LOCATION */}
          {/* <div className="mt-6 bg-slate-900 p-4 rounded-xl border border-white/5">
            <h4 className="font-semibold mb-1 flex items-center gap-2">
              <MapPin className="text-red-400" /> Your Location
            </h4>
            <p className="text-xs text-slate-300">
              {user.location?.address || "Not set"}
            </p>
          </div> */}
        </aside>
      </div>
    </div>
  );
}
