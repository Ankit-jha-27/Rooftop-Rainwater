/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { JSX, useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { firestore } from "@/firebase";

type NGO = {
  id: string;
  name: string;
  regNumber: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  state: string;
  cities: string;
  serviceAreas: string;
  website?: string;
  upi?: string;
  about: string;
  regFileUrl?: string;
  verifiedDocs: boolean;
  verifiedLegit: boolean;
  verifiedContact: boolean;
  approved: boolean;
  // optional approvedAt
  approvedAt?: any;
};

export default function AdminNGOPage(): JSX.Element {
  const [ngos, setNgos] = useState<NGO[]>([
    {
      id: "NGOAPP-123456",
      name: "Sahay Water Foundation",
      regNumber: "12A/345/2020",
      contactName: "Rohan Sharma",
      contactEmail: "mrakashsaha102@gmail.com",
      contactPhone: "9876543210",
      state: "Rajasthan",
      cities: "Jaipur, Jodhpur",
      serviceAreas: "Tanker distribution, Recharge",
      website: "https://sahayfoundation.org",
      about:
        "We work on emergency water tankers and groundwater recharge programmes.",
      regFileUrl:
        "https://via.placeholder.com/300?text=Registration+Certificate+(Demo)",
      verifiedDocs: false,
      verifiedLegit: false,
      verifiedContact: false,
      approved: false,
    },
  ]);

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function fetchNGOs() {
      try {
        const snap = await getDocs(collection(firestore, "ngos-admin"));
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as NGO[];

        setNgos(data);
        console.log("Fetched NGOs:", data);
      } catch (err) {
        console.error("Error fetching NGOs:", err);
      }
    }

    fetchNGOs();
  }, []);

  /**
   * Toggle a boolean verification field both in local state and Firestore.
   * field must be one of verifiedDocs | verifiedLegit | verifiedContact
   */
  const toggleCheck = async (id: string, field: keyof NGO): Promise<void> => {
    // update local state first (optimistic)
    setNgos((prev) =>
      prev.map((ngo) =>
        ngo.id === id ? { ...ngo, [field]: !ngo[field] } : ngo
      )
    );

    // then persist to Firestore
    try {
      const ngoRef = doc(firestore, "ngos-admin", id);
      // read current local value to invert and update
      const current = ngos.find((n) => n.id === id);
      const newVal = !(current ? (current as any)[field] : false);

      await updateDoc(ngoRef, { [field]: newVal });
    } catch (err) {
      console.error("Error updating verification field:", err);
      // revert locally on error
      setNgos((prev) =>
        prev.map((ngo) =>
          ngo.id === id ? { ...ngo, [field]: !ngo[field] } : ngo
        )
      );
      alert("Failed to update verification. Try again.");
    }
  };

  /**
   * Approve NGO
   * Preconditions: verifiedDocs && verifiedLegit && verifiedContact
   * Updates Firestore document: { approved: true, approvedAt: serverTimestamp() }
   */
  const approveNGO = async (ngo: NGO): Promise<void> => {
    if (!ngo.verifiedDocs || !ngo.verifiedLegit || !ngo.verifiedContact) {
      alert("⚠ Verify ALL checkboxes before approval.");
      return;
    }

    if (ngo.approved) {
      alert("✔ NGO is already approved.");
      return;
    }

    //       try {
    //     const res = await fetch("/api/admin/approve-ngo", {
    //       method: "POST",
    //       headers: { "Content-Type": "application/json" },
    //       body: JSON.stringify({ ngo }),
    //     });

    //     const data = await res.json();

    //     if (!res.ok || !data.ok) {
    //       alert("❌ Error approving NGO: " + data.error);
    //       return;
    //     }

    //     alert(`✔ NGO approved and email sent to ${ngo.contactEmail}`);

    //     setNgos((prev) =>
    //       prev.map((n) => (n.id === ngo.id ? { ...n, approved: true } : n))
    //     );
    //   } catch (error) {
    //     alert("Network error while approving NGO");
    //   }
    // };

    setLoading(true);
    try {
      const res = await fetch("/api/admin/approve-ngo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ngo }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        alert("❌ Error approving NGO: " + data.error);
        return;
      }

      
      const ngoRef = doc(firestore, "ngos-admin", ngo.id);
      await updateDoc(ngoRef, {
        approved: true,
        approvedAt: serverTimestamp(),
      });

      // update local state
      setNgos((prev) =>
        prev.map((n) => (n.id === ngo.id ? { ...n, approved: true } : n))
      );

      const ngoPublicRef = doc(firestore, "ngos", ngo.id);
      await setDoc(
        ngoPublicRef,
        {
          id: ngo.id,
          name: ngo.name,
          regNumber: ngo.regNumber,
          approved: true,
          approvedAt: serverTimestamp(),
          contactName: ngo.contactName,
          contactEmail: ngo.contactEmail,
          contactPhone: ngo.contactPhone,
          state: ngo.state,
          cities: ngo.cities,
          about: ngo.about,
          serviceAreas: ngo.serviceAreas,
          verifiedDocs: true,
          verifiedLegit: true,
          verifiedContact: true,
        },
        { merge: true }
      );

      // 3️⃣ Update local UI state
      setNgos((prev) =>
        prev.map((n) => (n.id === ngo.id ? { ...n, approved: true } : n))
      );


      alert(`✔ NGO approved successfully — ${ngo.contactEmail}`);

      // Optional: call an email / notification API here to send credentials / info.
      // await fetch("/api/admin/notify-approved", { method: "POST", body: JSON.stringify({ ngoId: ngo.id }) });
    } catch (err) {
      console.error("Error approving NGO:", err);
      alert("❌ Error approving NGO. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold">Admin – NGO Verification Panel</h1>
      <p className="text-gray-400 mt-1">
        Review NGO submissions and approve access for login.
      </p>

      <div className="mt-6 space-y-6">
        {ngos.map((ngo) => (
          <div
            key={ngo.id}
            className="p-5 bg-gray-800 border border-gray-700 rounded-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{ngo.name}</h2>
              <span
                className={`px-3 py-1 rounded-lg text-sm ${
                  ngo.approved
                    ? "bg-green-700 text-green-100"
                    : "bg-yellow-700 text-yellow-100"
                }`}
              >
                {ngo.approved ? "Approved" : "Pending"}
              </span>
            </div>

            <p className="text-gray-300 text-sm mt-1">
              Application ID: {ngo.id}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
              <div>
                <strong>Registration No:</strong> {ngo.regNumber}
              </div>
              <div>
                <strong>Contact:</strong> {ngo.contactName}
              </div>
              <div>
                <strong>Email:</strong> {ngo.contactEmail}
              </div>
              <div>
                <strong>Phone:</strong> {ngo.contactPhone}
              </div>
              <div>
                <strong>State:</strong> {ngo.state}
              </div>
              <div>
                <strong>Service Areas:</strong> {ngo.serviceAreas}
              </div>
              {ngo.website && (
                <div>
                  <strong>Website:</strong>{" "}
                  <a
                    href={ngo.website}
                    className="text-blue-400 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {ngo.website}
                  </a>
                </div>
              )}
            </div>

            <div className="mt-4">
              <strong>About:</strong>
              <p className="text-gray-300 text-sm mt-1">{ngo.about}</p>
            </div>

            <div className="mt-4">
              <strong>Registration Certificate:</strong>
              <div className="mt-2">
                {ngo.regFileUrl ? (
                  <a
                    href={ngo.regFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-blue-600 rounded-md text-sm"
                  >
                    View Document
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">
                    No document URL provided
                  </span>
                )}
              </div>
            </div>

            {/* CHECKBOXES */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <label className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={!!ngo.verifiedDocs}
                  onChange={() => toggleCheck(ngo.id, "verifiedDocs")}
                />
                Documents Verified
              </label>

              <label className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={!!ngo.verifiedLegit}
                  onChange={() => toggleCheck(ngo.id, "verifiedLegit")}
                />
                NGO Legit & Real
              </label>

              <label className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={!!ngo.verifiedContact}
                  onChange={() => toggleCheck(ngo.id, "verifiedContact")}
                />
                Contact Verified
              </label>
            </div>

            {/* APPROVE BUTTON */}
            <div className="mt-5">
              {!ngo.approved ? (
                <button
                  onClick={() => approveNGO(ngo)}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
                  disabled={loading}
                >
                  {loading ? "Approving..." : "Approve NGO"}
                </button>
              ) : (
                <p className="mt-4 text-green-400 font-semibold">
                  ✔ NGO Approved — Login details sent.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
