/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import React, {
  ChangeEvent,
  FormEvent,
  useMemo,
  useRef,
  useState,
  useEffect,
  JSX,
} from "react";
import { motion } from "framer-motion";
import { CheckCircle, ShieldCheck, Globe } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, firestore } from "@/firebase";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

/* ----------------------------- Helpers / Validators ----------------------------- */
async function generateUniqueNGOAppId(): Promise<string> {
  while (true) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const id = `NGOAPP-${randomNum}`;

    const ref = doc(firestore, "ngos-admin", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return id; // unique → safe to use
  }
}
const validateEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone: string): boolean =>
  /^\d{10,15}$/.test(phone.replace(/\D/g, ""));

type SignupErrors = Partial<
  Record<
    | "name"
    | "regNumber"
    | "regFile"
    | "contactName"
    | "contactEmail"
    | "contactPhone"
    | "state"
    | "serviceAreas"
    | "password"
    | "confirmPassword"
    | "upi",
    string
  >
>;

type SignupSuccess = { message: string; appId: string } | null;

/* --------------------------------- Component --------------------------------- */
export default function Page(): JSX.Element {
  const [active, setActive] = useState<"login" | "signup">("login");

  /* --- Login state --- */
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [remember, setRemember] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  /* --- Signup (NGO) state --- */
  const [name, setname] = useState<string>("");
  const [regNumber, setRegNumber] = useState<string>("");
  const [regFile, setRegFile] = useState<File | null>(null);
  const [regPreview, setRegPreview] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [state, setStateRegion] = useState<string>("");
  const [cities, setCities] = useState<string>("");
  const [serviceAreas, setServiceAreas] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [upi, setUpi] = useState<string>("");
  // const [password, setPassword] = useState<string>("");
  // const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [about, setAbout] = useState<string>("");
  const [signupErrors, setSignupErrors] = useState<SignupErrors>({});
  const [signupLoading, setSignupLoading] = useState<boolean>(false);
  const [signupSuccess, setSignupSuccess] = useState<SignupSuccess>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const states = useMemo(
    () => [
      "Andhra Pradesh",
      "Bihar",
      "Delhi",
      "Gujarat",
      "Karnataka",
      "Kerala",
      "Maharashtra",
      "Rajasthan",
      "Tamil Nadu",
      "Uttar Pradesh",
      "West Bengal",
      "Other",
    ],
    []
  );

  /* ------------------------------- File handling ------------------------------- */
  useEffect(() => {
    return () => {
      if (regPreview) URL.revokeObjectURL(regPreview);
    };
  }, [regPreview]);

  const handleRegFile = (file: File | null) => {
    if (!file) {
      setRegFile(null);
      if (regPreview) {
        URL.revokeObjectURL(regPreview);
        setRegPreview(null);
      }
      return;
    }

    setRegFile(file);

    // For images we show a preview via object URL. For PDFs browsers may show a preview too.
    const url = URL.createObjectURL(file);
    if (regPreview) URL.revokeObjectURL(regPreview);
    setRegPreview(url);
  };

  /* --------------------------------- Handlers --------------------------------- */
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!validateEmail(loginEmail)) {
      setLoginError("Enter a valid email address.");
      return;
    }

    if (loginPassword.length < 6) {
      setLoginError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoginLoading(true);

      // Firebase real login
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginEmail,
        loginPassword
      );

      const user = userCredential.user;

      // Optional: store persistence
      if (remember) {
        localStorage.setItem("ngo_logged_in", "1");
        localStorage.setItem("ngo_uid", user.uid);
      }

      alert("Login successful!");

      // redirect NGO to dashboard
      window.location.href = "/en/ngoDashboard";
    } catch (error: any) {
      console.error(error);

      switch (error.code) {
        case "auth/user-not-found":
          setLoginError("No account found with this email.");
          break;
        case "auth/wrong-password":
          setLoginError("Incorrect password.");
          break;
        case "auth/invalid-email":
          setLoginError("Invalid email address.");
          break;
        case "auth/too-many-requests":
          setLoginError("Too many failed attempts. Please try again later.");
          break;
        default:
          setLoginError("Login failed. Try again.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    const errors: SignupErrors = {};

    // -------- VALIDATION --------
    if (!name.trim()) errors.name = "NGO name is required.";
    if (!regNumber.trim())
      errors.regNumber = "Registration number is required.";
    if (!regFile) errors.regFile = "Upload a registration certificate.";
    if (!contactName.trim()) errors.contactName = "Contact person is required.";
    if (!validateEmail(contactEmail))
      errors.contactEmail = "Enter valid contact email.";
    if (!validatePhone(contactPhone))
      errors.contactPhone = "Enter valid phone number.";
    if (!state) errors.state = "Select state.";
    if (!serviceAreas.trim()) errors.serviceAreas = "List service areas.";
    if (upi && !/^.+@.+$/.test(upi)) errors.upi = "Invalid UPI ID.";

    setSignupErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSignupLoading(true);
    setSignupSuccess(null);

    try {
      // ---------- 1. Upload NGO document to Cloudinary ----------
      const formData = new FormData();
      formData.append("file", regFile);

      const uploadRes = await fetch("/api/ngo-doc", {
        method: "POST",
        body: formData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadJson.error || "Upload failed");
      }

      const regFileUrl = uploadJson.secure_url;

      // ---------- 2. Save NGO data to Firestore ----------
      const id = await generateUniqueNGOAppId();
      await setDoc(doc(firestore, "ngos-admin", id), {
        id: id,
        name,
        regNumber,
        regFileUrl,
        contactName,
        contactEmail,
        contactPhone,
        state,
        cities,
        serviceAreas: serviceAreas.split(",").map((s) => s.trim()),
        website: website || "",
        upi: upi || "",
        about,
        status: "pending", // waiting for admin verification
        createdAt: serverTimestamp(),
      });

      setSignupLoading(false);

      // Show success alert with document ID
      setSignupSuccess({
        message: "NGO application submitted successfully!",
        appId: id,
      });
    } catch (err) {
      console.error(err);
      setSignupLoading(false);
      setSignupErrors({
        general: "Something went wrong during signup.",
      });
    }
  };

  const FieldError: React.FC<{ children?: React.ReactNode }> = ({
    children,
  }) => {
    if (!children) return null;
    return <p className="text-rose-500 text-xs mt-1">{children}</p>;
  };

  /* ----------------------------------- JSX ----------------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-slate-100">
      {/* header ribbon */}
      <div className="w-full">
        <div className="h-2 bg-[#FF9933]" />
        <div className="flex items-center justify-between px-6 py-3 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-inner">
                <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden>
                  <rect x="0" y="0" width="48" height="16" fill="#FF9933" />
                  <rect x="0" y="16" width="48" height="16" fill="#ffffff" />
                  <rect x="0" y="32" width="48" height="16" fill="#138808" />
                  <circle cx="24" cy="24" r="2" fill="#054a91" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold">
                  JalYantra — NGO Portal
                </div>
                <div className="text-xs text-slate-300">
                  Verified partners for water redistribution
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs">
              <span className="px-2 py-0.5 bg-[#FF9933] rounded-sm" />
              <span className="px-2 py-0.5 bg-white rounded-sm border border-white/20" />
              <span className="px-2 py-0.5 bg-[#138808] rounded-sm" />
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-300">
                Only for verified NGOs & govt partners
              </div>
              <div className="px-3 py-1 rounded-full bg-white/6 text-emerald-200 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                Verified Partners
              </div>
            </div>
          </div>
        </div>
        <div className="h-2 bg-[#138808]" />
      </div>

      <div className="mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <aside className="lg:col-span-1 p-6 rounded-2xl bg-gradient-to-b from-white/5 to-white/3 border border-white/5 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-2xl font-bold text-white">
                IN
              </div>
              <div>
                <h2 className="text-xl font-bold">Official Partner Access</h2>
                <p className="text-sm text-slate-300 mt-1">
                  This portal is for organisations who receive donated water
                  credits from citizens, and convert them into on-ground
                  distribution or recharge programmes.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-700/10 flex items-center justify-center text-emerald-300">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    Trust & Verification
                  </div>
                  <div className="text-xs text-slate-300">
                    Upload registration docs, bank details, and proof of past
                    relief work.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-700/10 flex items-center justify-center text-sky-300">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    Focused on Water Relief
                  </div>
                  <div className="text-xs text-slate-300">
                    Only water-related operations (tanker distribution,
                    recharge, storage) will be accepted.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                  <div className="text-xs">₹</div>
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    Financial Transparency
                  </div>
                  <div className="text-xs text-slate-300">
                    Optional UPI / bank details to receive grants or
                    reimbursements.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3">How it works</h4>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-[#FF9933] flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <div>
                    <div className="font-medium">Get verified</div>
                    <div className="text-xs text-slate-300">
                      Submit registration, showcase past relief activities.
                    </div>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-[#ffffff] flex items-center justify-center text-[#054a91] font-bold">
                    2
                  </div>
                  <div>
                    <div className="font-medium">Receive credits</div>
                    <div className="text-xs text-slate-300">
                      Donors allocate water credits to your organisation.
                    </div>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-[#138808] flex items-center justify-center text-white font-bold">
                    3
                  </div>
                  <div>
                    <div className="font-medium">Distribute & report</div>
                    <div className="text-xs text-slate-300">
                      Perform distribution and upload proofs to claim
                      verification.
                    </div>
                  </div>
                </li>
              </ol>
            </div>

            <div className="mt-6 text-xs text-slate-400">
              <strong>Note:</strong> This portal is for organisations that will{" "}
              <em>actually</em> redistribute water or perform recharge. Misuse
              will lead to rejection and blacklisting.
            </div>

            <div className="mt-3">
              <a href="/" className="text-blue-500 underline">
                Back
              </a>
            </div>
          </aside>

          <main className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-b from-white/3 to-white/5 border border-white/6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white font-bold">
                  NGO
                </div>
                <div>
                  <div className="text-xs text-slate-400">Partner Access</div>
                  <div className="text-2xl font-semibold">Login or Apply</div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/5 rounded-full p-1">
                <button
                  className={`px-4 py-1 rounded-full text-sm ${
                    active === "login"
                      ? "bg-orange-500 text-white"
                      : "text-slate-300"
                  }`}
                  onClick={() => setActive("login")}
                >
                  Login
                </button>
                <button
                  className={`px-4 py-1 rounded-full text-sm ${
                    active === "signup"
                      ? "bg-green-700 text-white"
                      : "text-slate-300"
                  }`}
                  onClick={() => setActive("signup")}
                >
                  Sign Up
                </button>
              </div>
            </div>

            <div>
              {active === "login" ? (
                <motion.form
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleLogin}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-300">Email</label>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-transparent focus:border-sky-500 outline-none"
                        placeholder="contact@ngo.org"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300">Password</label>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-transparent focus:border-sky-500 outline-none"
                        placeholder="●●●●●●●●"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="w-4 h-4"
                      />
                      Remember me
                    </label>
                    <a href="#" className="text-sky-300 underline">
                      Forgot password?
                    </a>
                  </div>

                  {loginError && (
                    <p className="text-rose-400 text-sm mt-2">{loginError}</p>
                  )}

                  <div className="flex items-center gap-3 mt-4">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-emerald-400 font-semibold hover:scale-[1.01] transition"
                      disabled={loginLoading}
                    >
                      {loginLoading ? "Signing in..." : "Sign in"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail("admin@ngo.test");
                        setLoginPassword("password");
                      }}
                      className="px-3 py-2 rounded-lg border border-white/10 text-sm"
                    >
                      Demo
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleSignup}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-300">
                        NGO / Organisation Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setname(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg bg-slate-900 border ${
                          signupErrors.name
                            ? "border-rose-500"
                            : "border-transparent"
                        } focus:border-sky-500 outline-none`}
                        placeholder="e.g. Sahay Water Foundation"
                      />
                      <FieldError>{signupErrors.name}</FieldError>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300">
                        Registration number
                      </label>
                      <input
                        type="text"
                        value={regNumber}
                        onChange={(e) => setRegNumber(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg bg-slate-900 border ${
                          signupErrors.regNumber
                            ? "border-rose-500"
                            : "border-transparent"
                        } focus:border-sky-500 outline-none`}
                        placeholder="e.g. 12A/345/2020"
                      />
                      <FieldError>{signupErrors.regNumber}</FieldError>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs text-slate-300">
                        Registration Certificate (PDF / Image)
                      </label>
                      <div className="mt-2 flex items-center gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleRegFile(e.target.files?.[0] ?? null)
                          }
                          className="text-xs file:bg-sky-500 file:text-white file:px-3 file:py-1 file:rounded-md file:border-0"
                        />
                        {regPreview && (
                          <div className="w-28 h-20 rounded-md overflow-hidden border">
                            {/* Preview could be PDF or image; put it in an img tag if it's an image */}
                            <img
                              src={regPreview}
                              alt="preview"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                      </div>
                      <FieldError>{signupErrors.regFile}</FieldError>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300">
                        Primary Contact Person
                      </label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg bg-slate-900 border ${
                          signupErrors.contactName
                            ? "border-rose-500"
                            : "border-transparent"
                        } focus:border-sky-500 outline-none`}
                        placeholder="Full name"
                      />
                      <FieldError>{signupErrors.contactName}</FieldError>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg bg-slate-900 border ${
                          signupErrors.contactEmail
                            ? "border-rose-500"
                            : "border-transparent"
                        } focus:border-sky-500 outline-none`}
                        placeholder="contact@example.org"
                      />
                      <FieldError>{signupErrors.contactEmail}</FieldError>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg bg-slate-900 border ${
                          signupErrors.contactPhone
                            ? "border-rose-500"
                            : "border-transparent"
                        } focus:border-sky-500 outline-none`}
                        placeholder="9876543210"
                      />
                      <FieldError>{signupErrors.contactPhone}</FieldError>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300">
                        State / Region
                      </label>
                      <select
                        value={state}
                        onChange={(e) => setStateRegion(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg bg-slate-900 border ${
                          signupErrors.state
                            ? "border-rose-500"
                            : "border-transparent"
                        } focus:border-sky-500 outline-none`}
                      >
                        <option value="">Select state</option>
                        {states.map((s) => (
                          <option value={s} key={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <FieldError>{signupErrors.state}</FieldError>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs text-slate-300">
                        Cities / Districts you serve (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={cities}
                        onChange={(e) => setCities(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-transparent focus:border-sky-500 outline-none"
                        placeholder="e.g. Jaipur, Sikar, Jodhpur"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs text-slate-300">
                        Service areas (e.g. Tanker distribution, community
                        tanks, recharge)
                      </label>
                      <input
                        type="text"
                        value={serviceAreas}
                        onChange={(e) => setServiceAreas(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg bg-slate-900 border ${
                          signupErrors.serviceAreas
                            ? "border-rose-500"
                            : "border-transparent"
                        } focus:border-sky-500 outline-none`}
                        placeholder="e.g. Emergency tanker, Well recharge, Rainwater reuse"
                      />
                      <FieldError>{signupErrors.serviceAreas}</FieldError>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300">
                        Website (optional)
                      </label>
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-transparent focus:border-sky-500 outline-none"
                        placeholder="https://"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300">
                        UPI / Payment (for grants, optional)
                      </label>
                      <input
                        type="text"
                        value={upi}
                        onChange={(e) => setUpi(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg bg-slate-900 border ${
                          signupErrors.upi
                            ? "border-rose-500"
                            : "border-transparent"
                        } focus:border-sky-500 outline-none`}
                        placeholder="example@bank"
                      />
                      <FieldError>{signupErrors.upi}</FieldError>
                    </div>

                    {/* <div>
                      <label className="text-xs text-slate-300">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg bg-slate-900 border ${signupErrors.password ? "border-rose-500" : "border-transparent"} focus:border-sky-500 outline-none`}
                        placeholder="Create a password"
                      />
                      <FieldError>{signupErrors.password}</FieldError>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300">Confirm password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg bg-slate-900 border ${signupErrors.confirmPassword ? "border-rose-500" : "border-transparent"} focus:border-sky-500 outline-none`}
                        placeholder="Repeat password"
                      />
                      <FieldError>{signupErrors.confirmPassword}</FieldError>
                    </div> */}

                    <div className="md:col-span-2">
                      <label className="text-xs text-slate-300">
                        Short description (mission / what you do)
                      </label>
                      <textarea
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-transparent focus:border-sky-500 outline-none"
                        placeholder="Briefly describe your operations and how you will use water credits..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-400 to-sky-500 font-semibold hover:scale-[1.01] transition cursor-pointer"
                      disabled={signupLoading}
                      // onClick={setSi}
                    >
                      {signupLoading ? "Submitting..." : "Submit application"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setname("");
                        setRegNumber("");
                        setRegFile(null);
                        if (regPreview) {
                          URL.revokeObjectURL(regPreview);
                          setRegPreview(null);
                        }
                        setContactName("");
                        setContactEmail("");
                        setContactPhone("");
                        setStateRegion("");
                        setCities("");
                        setServiceAreas("");
                        setWebsite("");
                        setUpi("");
                        // setPassword("");
                        // setConfirmPassword("");
                        setAbout("");
                        setSignupErrors({});
                        setSignupSuccess(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="px-3 py-2 rounded-lg border border-white/10 text-sm"
                    >
                      Reset
                    </button>
                  </div>

                  {signupSuccess && (
                    <div className="rounded-md bg-emerald-900/30 p-3 text-sm mt-4">
                      <div className="font-semibold text-emerald-300">
                        Application received
                      </div>
                      <div className="text-slate-200 mt-1">
                        {signupSuccess.message}
                      </div>
                      <div className="text-slate-400 mt-1 text-xs">
                        Application ID:{" "}
                        <span className="text-slate-100 font-mono">
                          {signupSuccess.appId}
                        </span>
                      </div>
                    </div>
                  )}
                </motion.form>
              )}
            </div>

            <div className="mt-6 text-xs text-slate-400">
              <strong>Purpose:</strong> This portal is exclusively for NGOs /
              government partners who will <em>receive</em> water credits
              donated by citizens and convert them into on-ground water
              distribution, tanker operations, or recharge programs. Misuse,
              false claims, or unverifiable submissions will be rejected and may
              be reported.
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
