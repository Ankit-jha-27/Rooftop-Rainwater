/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { firestore, auth } from "@/firebase";
import { Plus, Search } from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

type RequestItem = {
  id: string;
  amount: number;
  unit: "L" | "KL";
  requiredLiters: number;
  location: string;
  urgency: "low" | "medium" | "high";
  notes: string;
  status: string;
  createdAt: any;
};

export default function NGODashboard() {
  const [ngoId, setNgoId] = useState<string>("");
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [amount, setAmount] = useState<number | "">("");
  const [unit, setUnit] = useState<"L" | "KL">("L");
  const [location, setLocation] = useState<string>("");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high">("medium");
  const [notes, setNotes] = useState<string>("");

  const [search, setSearch] = useState("");
  const router = useRouter();

  /* ------------------------------------------------------------
     1️⃣ Verify logged-in NGO + load NGO ID using email lookup
  ------------------------------------------------------------ */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/");
        return;
      }

      if (!user.email) return;

      try {
        // NGOs stored in "ngos" collection WITH email
        const q = query(
          collection(firestore, "ngos"),
          where("contactEmail", "==", user.email)
        );

        const snap = await getDocs(q);

        if (snap.empty) {
          console.log("No NGO record found for this login.");
          return;
        }

        const ngoDoc = snap.docs[0];
        setNgoId(ngoDoc.id); // Use Firestore doc id — correct
      } catch (err) {
        console.error("NGO Fetch Error:", err);
      }
    });

    return () => unsub();
  }, [router]);

  /* ------------------------------------------------------------
     2️⃣ Real-time request listener (runs only AFTER ngoId loaded)
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!ngoId) return;

    const ref = collection(firestore, "ngos", ngoId, "requests");
    const q = query(ref, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const arr: RequestItem[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));

      setRequests(arr);
      setLoading(false);
    });

    return () => unsub();
  }, [ngoId]);

  /* ------------------------------------------------------------
     3️⃣ Submit new water request
  ------------------------------------------------------------ */
  const submitRequest = async () => {
    if (amount === "" || location.trim().length < 3) {
      alert("Enter amount & location");
      return;
    }

    const liters = unit === "L" ? Number(amount) : Number(amount) * 1000;

    await addDoc(collection(firestore, "ngos", ngoId, "requests"), {
      amount: Number(amount),
      unit,
      requiredLiters: liters,
      location,
      urgency,
      notes,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    setAmount("");
    setLocation("");
    setNotes("");
    setUrgency("medium");

    alert("Request submitted!");
  };

  /* ------------------------------------------------------------
     4️⃣ Search Filter
  ------------------------------------------------------------ */
  const filteredRequests = requests.filter(
    (r) =>
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.location.toLowerCase().includes(search.toLowerCase())
  );

  /* ------------------------------------------------------------
     5️⃣ UI Component
  ------------------------------------------------------------ */
  const [activeTab, setActiveTab] = useState<"requests" | "donors">("requests");

  // mock donors -- replace with real donors state / fetch later
  // const donors = useMemo<Donor[]>(
  //   () => [
  //     {
  //       id: "D-1",
  //       name: "Ramesh Kumar",
  //       donatedLiters: 1200,
  //       email: "ramesh@gmail.com",
  //       phone: "9876543210",
  //       lastDonatedAt: "2025-11-30",
  //     },
  //     {
  //       id: "D-2",
  //       name: "Sangeeta D",
  //       donatedLiters: 800,
  //       email: "sangeeta@example.com",
  //       phone: "9123456789",
  //       lastDonatedAt: "2025-11-28",
  //     },
  //     {
  //       id: "D-3",
  //       name: "Rahul P",
  //       donatedLiters: 400,
  //       email: "rahul@example.com",
  //       phone: "9988776655",
  //       lastDonatedAt: "2025-11-25",
  //     },
  //   ],
  //   []
  // );

  const [donors, setDonors] = useState<Donor[]>([]);

  useEffect(() => {
    if (!ngoId) return;

    const donorsRef = collection(firestore, "ngos", ngoId, "donors");

    const unsub = onSnapshot(donorsRef, (snap) => {
      const arr: Donor[] = snap.docs.map((doc) => {
        const data = doc.data() as any;

        return {
          id: doc.id,
          name: data.name,
          donatedLiters: data.donatedLiters || 0,
          email: data.email || "",
          phone: data.phone || "",
          lastDonatedAt:
            data.lastDonatedAt?.toDate?.()?.toLocaleString() || "N/A",
        };
      });

      setDonors(arr);
    });

    return () => unsub();
  }, [ngoId]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // clear any local session keys if you used them
      localStorage.removeItem("ngo_logged_in");
      localStorage.removeItem("ngo_uid");
      router.push("/");
    } catch (err) {
      console.error("Sign out error:", err);
      alert("Sign out failed. Check console.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">NGO Dashboard</h1>
            <p className="text-slate-400 mt-1">
              Request water from donors & manage distribution.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              className="px-3 py-2 bg-slate-800 rounded-lg"
              placeholder="Search by ID / Location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="w-5 h-5 text-slate-400" />

            {/* Sign out button - small, unobtrusive */}
            <button
              onClick={handleSignOut}
              className="ml-2 px-3 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-sm font-medium"
              title="Sign out"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Request Form */}
          <div className="bg-slate-800 p-6 rounded-xl border border-white/10">
            <h2 className="font-semibold mb-4 text-lg">Request Water</h2>

            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="text-xs text-slate-400">Amount</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) =>
                      setAmount(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="flex-1 px-3 py-2 bg-slate-900 rounded-lg"
                    placeholder="e.g. 500"
                  />
                  <select
                    className="px-3 py-2 bg-slate-900 rounded-lg"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as "L" | "KL")}
                  >
                    <option value="L">L</option>
                    <option value="KL">KL</option>
                  </select>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="text-xs text-slate-400">Location</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 rounded-lg mt-1"
                  placeholder="Village / District / City"
                />
              </div>

              {/* Urgency */}
              <div>
                <label className="text-xs text-slate-400">Urgency</label>
                <div className="flex gap-2 mt-1">
                  {["low", "medium", "high"].map((u) => (
                    <button
                      key={u}
                      className={`px-3 py-2 rounded-lg ${
                        urgency === u ? "bg-sky-600" : "bg-slate-900"
                      }`}
                      onClick={() => setUrgency(u as any)}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-slate-400">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 rounded-lg mt-1"
                  rows={3}
                  placeholder="Explain why this water is needed..."
                />
              </div>

              <button
                onClick={submitRequest}
                className="w-full py-2 bg-sky-600 rounded-lg font-semibold"
              >
                <Plus className="inline w-4 h-4 mr-1" />
                Submit Request
              </button>
            </div>
          </div>

          {/* Request Table + Donors Tab */}
          <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">
                {activeTab === "requests" ? "Request History" : "Donors"}
              </h2>

              {/* Tab controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("requests")}
                  className={`px-3 py-1 rounded-full text-sm ${
                    activeTab === "requests"
                      ? "bg-slate-700 text-white"
                      : "text-slate-300"
                  }`}
                >
                  Requests
                </button>
                <button
                  onClick={() => setActiveTab("donors")}
                  className={`px-3 py-1 rounded-full text-sm ${
                    activeTab === "donors"
                      ? "bg-slate-700 text-white"
                      : "text-slate-300"
                  }`}
                >
                  Donors
                </button>
              </div>
            </div>

            {activeTab === "requests" ? (
              loading ? (
                <div className="text-slate-400">Loading...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-slate-400">No requests found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/10">
                      <th className="py-2">ID</th>
                      <th>Amount</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRequests.map((r: RequestItem) => (
                      <tr key={r.id} className="border-b border-white/10">
                        <td className="py-2 font-mono">{r.id}</td>
                        <td>{r.requiredLiters} L</td>
                        <td>{r.location}</td>
                        <td>
                          <span className="px-3 py-1 rounded-full bg-slate-700">
                            {r.status}
                          </span>
                        </td>
                        <td>{r.createdAt?.toDate?.().toLocaleString?.()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              // Donors tab content (kept minimal and consistent with design)
              <div>
                <div className="mb-4 text-slate-400">
                  Track donors who contributed — contact, total donated, last
                  donation.
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-white/10">
                        <th className="py-2">Donor</th>
                        <th>Total (L)</th>
                        <th>Contact</th>
                        <th>Last donated</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donors.map((d) => (
                        <tr key={d.id} className="border-b border-white/10">
                          <td className="py-2 font-semibold">{d.name}</td>
                          <td className="">{d.donatedLiters} L</td>
                          <td className="text-xs text-slate-300">
                            {d.email || "-"}
                            <br />
                            {d.phone || "-"}
                          </td>
                          <td className="text-slate-300">{d.lastDonatedAt}</td>
                          <td>
                            <button
                              className="px-3 py-1 rounded-lg bg-sky-600 text-xs"
                              onClick={() =>
                                alert(
                                  `Contact ${d.name} at ${
                                    d.phone || d.email || "N/A"
                                  }`
                                )
                              }
                            >
                              Contact
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-xs text-slate-400">
                  Tip: integrate real donor data from Firestore and add actions
                  like "Thank donor", "Issue certificate", or &quot;View
                  donations".
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
