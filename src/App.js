import { useState, useEffect } from "react";

// Responsive hook — returns current window width
const useWindowWidth = () => {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return width;
};

const WEBHOOK_URL = "https://jwhfinancial.app.n8n.cloud/webhook/digest-signup";

const ROLES = [
  { value: "", label: "Select your role…" },
  { value: "Loan Officer", label: "Loan Officer" },
  { value: "Mortgage Broker", label: "Mortgage Broker" },
  { value: "Realtor / Real Estate Agent", label: "Realtor / Real Estate Agent" },
  { value: "Real Estate Investor", label: "Real Estate Investor" },
  { value: "Lender / Underwriter", label: "Lender / Underwriter" },
  { value: "Other", label: "Other (please specify)" },
];

const SAMPLE_RATES = [
  { label: "30-YR FIXED", value: "6.81%", change: "-6 bps", down: true },
  { label: "15-YR FIXED", value: "6.12%", change: "-4 bps", down: true },
  { label: "10-YR TREASURY", value: "4.28%", change: "-5 bps", down: true },
  { label: "MBS 6.0", value: "98-18", change: "+6 ticks", down: false },
];

const SOURCES = [
  "HousingWire", "MND", "MBS Live", "Natl Mortgage Pro", "Federal Reserve",
  "CFPB", "Freddie Mac", "Fannie Mae", "MBA", "NAR", "Inman", "Zillow Research",
  "Redfin News", "RealTrends", "NAHB", "CoStar", "Calculated Risk",
  "BLS", "Census Bureau", "Conference Board", "Bloomberg RE", "WSJ Housing",
];

const STORIES = [
  { source: "Federal Reserve", color: "#065F46", headline: "Powell signals rates staying higher for longer", summary: "Chair Powell pushed back on rate-cut expectations, citing persistent inflation.", isTop: true, isRealtor: false },
  { source: "HousingWire", color: "#1E3A8A", headline: "Existing sales hit 14-year low as supply crunch deepens", summary: "NAR: 3.96M SAAR in May. Only 1.08M homes on market — 2.9 months supply.", isTop: true, isRealtor: true },
  { source: "Inman", color: "#7C3AED", headline: "NAR settlement reshapes buyer agent compensation rules", summary: "New commission rules take effect Aug 17. Agents must have signed agreements before showing homes.", isTop: false, isRealtor: true },
];

const B = {
  navy: "#0D1321", blue: "#3B6FE8", green: "#22C55E",
  red: "#DC2626", pageBg: "#EEF0F5", card: "#FFFFFF",
  border: "#E2E5EC", text: "#0D1321", muted: "#6B7280",
  light: "#9CA3AF", realtorBg: "#F0FDF4",
  realtorBorder: "#BBF7D0", realtorText: "#15803D",
};

const inp = (err) => ({
  width: "100%", padding: "10px 14px",
  border: `1.5px solid ${err ? B.red : B.border}`,
  borderRadius: "8px", fontSize: "14px", color: B.text,
  outline: "none", fontFamily: "inherit",
  boxSizing: "border-box", background: B.card,
  appearance: "none", WebkitAppearance: "none",
});

const inpSmall = {
  width: "100%", padding: "9px 14px",
  border: `1.5px solid ${B.border}`,
  borderRadius: "8px", fontSize: "14px", color: B.text,
  outline: "none", fontFamily: "inherit",
  boxSizing: "border-box", background: "#FAFAFA",
  appearance: "none", WebkitAppearance: "none",
};



function RateRow({ label, value, change, down }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${B.border}` }}>
      <span style={{ fontSize: "12px", fontWeight: "600", color: B.muted, letterSpacing: "0.03em" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: "15px", fontWeight: "700", color: B.text }}>{value}</span>
        <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: "700", fontFamily: "'Courier New', monospace", background: down ? "#F0FDF4" : "#FEF2F2", color: down ? B.green : B.red }}>{change}</span>
      </div>
    </div>
  );
}

function StoryCard({ story }) {
  return (
    <div style={{ display: "flex", marginBottom: "12px", borderRadius: "8px", overflow: "hidden", border: `1px solid ${B.border}` }}>
      <div style={{ width: "4px", background: story.color, flexShrink: 0 }} />
      <div style={{ background: B.card, padding: "12px 16px", flex: 1 }}>
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "6px" }}>
          <span style={{ display: "inline-block", padding: "3px 9px", background: story.color, color: "white", fontSize: "9px", fontWeight: "700", borderRadius: "20px", letterSpacing: "0.06em", textTransform: "uppercase" }}>{story.source}</span>
          {story.isTop && <span style={{ display: "inline-block", padding: "3px 9px", background: B.blue, color: "white", fontSize: "9px", fontWeight: "700", borderRadius: "20px" }}>★ Top Story</span>}
          {story.isRealtor && <span style={{ display: "inline-block", padding: "3px 9px", background: B.realtorBg, color: B.realtorText, fontSize: "9px", fontWeight: "700", borderRadius: "20px", border: `1px solid ${B.realtorBorder}` }}>🏡 Realtor</span>}
        </div>
        <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "700", color: B.navy, lineHeight: "1.35" }}>{story.headline}</p>
        <p style={{ margin: 0, fontSize: "13px", color: B.muted, lineHeight: "1.6" }}>{story.summary}</p>
      </div>
    </div>
  );
}

export default function DigestSignup() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", company: "", role: "", roleOther: "", phone: "" });

  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 620;

  // Detect local delivery time — digest sends at 6 AM PT
  // n8n is set to PT and handles DST automatically.
  // Intl API converts 6 AM PT to the correct local time for each visitor.
  const getLocalDeliveryTime = () => {
    try {
      // Build today at 6 AM PT — correctly accounts for DST
      const ptDate = new Date(new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" }));
      ptDate.setTime(ptDate.getTime() + 6 * 60 * 60 * 1000);
      // Convert to visitor local time
      const localStr = ptDate.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      });
      // Strip D/S: PDT→PT, PST→PT, EDT→ET, EST→ET, CDT→CT, CST→CT, MDT→MT, MST→MT
      return localStr.replace(/(PDT|PST|EDT|EST|CDT|CST|MDT|MST)/g, (m) => m[0] + "T");
    } catch {
      return "6 AM PT";
    }
  };
  const deliveryTime = getLocalDeliveryTime();
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(p => ({ ...p, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (!form.role) e.role = "Please select your role";
    if (form.role === "Other" && !form.roleOther.trim()) e.roleOther = "Please describe your role";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setStatus("loading");
    try { await fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); } catch { }
    setStatus("success");
  };

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif", background: B.pageBg, minHeight: "100vh" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        input:focus, select:focus { border-color: ${B.blue} !important; box-shadow: 0 0 0 3px rgba(59,111,232,0.1); }
        input::placeholder { color: ${B.light}; }
        select option { color: ${B.text}; background: white; }
      `}</style>

      {/* TOP STRIPE */}
      <div style={{ height: "5px", background: B.blue }} />

      {/* HEADER */}
      <div style={{ background: B.navy, padding: "16px 24px" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: "0 0 1px", fontSize: "9px", fontWeight: "700", color: B.blue, letterSpacing: "0.14em", textTransform: "uppercase" }}>JWH Financial · Daily Briefing</p>
            <h1 style={{ margin: 0, fontSize: "19px", fontWeight: "800", color: "white", letterSpacing: "-0.02em" }}>Mortgage Digest</h1>
          </div>
          <div style={{ width: "38px", height: "38px", background: B.blue, borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "19px" }}>🏠</div>
        </div>
      </div>

      {/* HERO + FORM SECTION */}
      <div style={{ background: B.pageBg, padding: isMobile ? "28px 16px 24px" : "40px 24px 32px" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto", animation: "fadeUp 0.45s ease both" }}>

          {/* Hero text — centered */}
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: B.card, border: `1px solid ${B.border}`, borderRadius: "20px", padding: "5px 14px", marginBottom: "12px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: B.green }} />
              <span style={{ fontSize: "12px", fontWeight: "600", color: B.muted }}>{`Delivered every weekday at ${deliveryTime}`}</span>
            </div>
            <h2 style={{ margin: "0 0 10px", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: "800", color: B.navy, letterSpacing: "-0.03em", lineHeight: "1.1" }}>
              The mortgage market<br />
              <span style={{ color: B.blue }}>summarized before breakfast.</span>
            </h2>
            <p style={{ margin: "0 auto 24px", maxWidth: "460px", fontSize: "16px", color: B.muted, lineHeight: "1.7" }}>
              {`Rates, MBS, Fed moves, housing data, and effects analysis — distilled from 20 industry sources into one sharp email, in your inbox by ${deliveryTime}.`}
            </p>
          </div>

          {/* Form — centered card */}
          {status === "success" ? (
            <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center", padding: "32px 0" }}>
              <div style={{ width: "56px", height: "56px", background: "#F0FDF4", border: `2px solid ${B.green}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "24px" }}>✅</div>
              <h3 style={{ margin: "0 0 8px", color: B.navy, fontSize: "20px", fontWeight: "700" }}>You’re on the list.</h3>
              <p style={{ margin: 0, fontSize: "14px", color: B.muted, lineHeight: "1.7" }}>{`The latest digest is on its way to your inbox now.`}<br />{`You’ll receive each new digest every weekday at ${deliveryTime}.`}</p>
            </div>
          ) : (
            <div style={{ maxWidth: "560px", margin: "0 auto" }}>


              <div style={{ padding: "0" }}>

                {/* Rows 1+2: two columns — Col 1: First/Last, Col 2: Email/Role */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>

                  {/* Column 1: First Name stacked above Last Name */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>
                      <input type="text" value={form.firstName} onChange={set("firstName")} placeholder="First Name *" style={inp(errors.firstName)} />
                      {errors.firstName && <p style={{ margin: "3px 0 0", fontSize: "11px", color: B.red }}>{errors.firstName}</p>}
                    </div>
                    <div>
                      <input type="text" value={form.lastName} onChange={set("lastName")} placeholder="Last Name *" style={inp(errors.lastName)} />
                      {errors.lastName && <p style={{ margin: "3px 0 0", fontSize: "11px", color: B.red }}>{errors.lastName}</p>}
                    </div>
                  </div>

                  {/* Column 2: Work Email stacked above Role */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>
                      <input type="email" value={form.email} onChange={set("email")} placeholder="Work Email *" style={inp(errors.email)} />
                      {errors.email && <p style={{ margin: "3px 0 0", fontSize: "11px", color: B.red }}>{errors.email}</p>}
                    </div>
                    <div>
                      <select value={form.role} onChange={set("role")} style={{ ...inp(errors.role), color: form.role ? B.text : B.light, cursor: "pointer" }}>
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      {errors.role && <p style={{ margin: "3px 0 0", fontSize: "11px", color: B.red }}>{errors.role}</p>}
                    </div>
                  </div>
                </div>

                {form.role === "Other" && (
                  <div style={{ marginBottom: "14px" }}>
                    <input type="text" value={form.roleOther} onChange={set("roleOther")} placeholder="Describe your role *" style={inp(errors.roleOther)} />
                    {errors.roleOther && <p style={{ margin: "3px 0 0", fontSize: "11px", color: B.red }}>{errors.roleOther}</p>}
                  </div>
                )}

                {/* Row 3: Optional — Phone | Company */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "12px 0 10px" }}>
                  <div style={{ flex: 1, height: "1px", background: B.border }} />
                  <span style={{ fontSize: "10px", fontWeight: "700", color: B.light, letterSpacing: "0.08em", textTransform: "uppercase" }}>Optional</span>
                  <div style={{ flex: 1, height: "1px", background: B.border }} />
                </div>
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <input type="tel" value={form.phone} onChange={set("phone")} placeholder="Phone Number" style={inpSmall} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input type="text" value={form.company} onChange={set("company")} placeholder="Company" style={inpSmall} />
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={status === "loading"}
                  style={{ width: "100%", padding: isMobile ? "16px 20px" : "14px 20px", background: status === "loading" ? B.light : B.blue, color: "white", border: "none", borderRadius: "9px", fontSize: "15px", fontWeight: "700", cursor: status === "loading" ? "not-allowed" : "pointer", letterSpacing: "0.01em" }}
                >
                  {status === "loading" ? "subscribing…" : "subscribe free"}
                </button>
                <p style={{ margin: "10px 0 0", fontSize: "11px", color: B.light, textAlign: "center" }}>no spam · unsubscribe anytime</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PREVIEW SECTION */}
      <div style={{ background: "#E4E7EF", padding: isMobile ? "20px 12px" : "28px 24px" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <p style={{ margin: "0 0 20px", fontSize: "10px", fontWeight: "700", color: B.light, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center" }}>Sample Digest Preview</p>

          {/* Email preview card */}
          <div style={{ background: B.card, borderRadius: "14px", border: `1px solid ${B.border}`, overflow: "hidden", boxShadow: "0 2px 12px rgba(13,19,33,0.08)", overflowX: "auto" }}>

            {/* Blue stripe */}
            <div style={{ height: "5px", background: B.blue }} />

            {/* Email header */}
            <div style={{ background: B.navy, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: "0 0 3px", fontSize: "9px", fontWeight: "700", color: B.blue, letterSpacing: "0.14em", textTransform: "uppercase" }}>JWH Financial · Daily Briefing · Thursday, June 19</p>
                <p style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "white", letterSpacing: "-0.02em", lineHeight: "1.2" }}>Mortgage &amp; Real Estate Digest</p>
              </div>
              <div style={{ width: "44px", height: "44px", background: B.blue, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0, marginLeft: "16px" }}>🏠</div>
            </div>

            {/* Market snapshot */}
            <div style={{ background: B.card, padding: "22px 28px", borderBottom: `6px solid ${B.pageBg}` }}>
              <p style={{ margin: "0 0 4px", fontSize: "9px", fontWeight: "700", color: B.blue, letterSpacing: "0.12em", textTransform: "uppercase" }}>Market Snapshot</p>
              <p style={{ margin: "0 0 16px", fontSize: "14px", color: B.muted, lineHeight: "1.65" }}>Rates pulled back 6bps after softer PPI data. MBS rallied 12 ticks before giving back half gains on Powell's remarks.</p>
              {SAMPLE_RATES.map((r, i) => <RateRow key={i} {...r} />)}
            </div>

            {/* Stories */}
            <div style={{ background: B.pageBg, padding: "22px 28px" }}>
              <p style={{ margin: "0 0 14px", fontSize: "9px", fontWeight: "700", color: B.blue, letterSpacing: "0.12em", textTransform: "uppercase" }}>Today's Top Stories</p>
              {STORIES.map((s, i) => <StoryCard key={i} story={s} />)}
              <p style={{ margin: "8px 0 0", fontSize: "12px", color: B.light, textAlign: "center" }}>+ effects analysis, realtor insights, and what to watch in every digest</p>
            </div>

            {/* Email footer */}
            <div style={{ background: B.navy, padding: "18px 28px", textAlign: "center" }}>
              <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: "700", color: "white" }}>JWH Financial · Mortgage Digest</p>
              <p style={{ margin: "0 0 10px", fontSize: "10px", color: B.light, fontFamily: "'Courier New', monospace" }}>mortgage-digest@jwhfinance.com</p>
              <p style={{ margin: "0 0 8px", fontSize: "10px", color: "#374151", lineHeight: "1.7" }}>
                HousingWire · MND · MBS Live · NMP · Fed · CFPB · Freddie Mac · Fannie Mae · MBA<br />
                NAR · Inman · Zillow · Redfin · NAHB · CoStar · BLS · Census · Conference Board · Bloomberg RE · WSJ Housing
              </p>
              <button onClick={() => { }} style={{ fontSize: "11px", color: B.light, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Unsubscribe</button>
            </div>
            <div style={{ height: "4px", background: B.blue }} />
          </div>
        </div>
      </div>

      {/* SOURCES */}
      <div style={{ background: B.pageBg, padding: "36px 24px 48px" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ margin: "0 0 14px", fontSize: "10px", fontWeight: "700", color: B.light, letterSpacing: "0.1em", textTransform: "uppercase" }}>Pulling from 20 sources daily</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
            {SOURCES.map((s, i) => (
              <span key={i} style={{ padding: "5px 14px", background: B.card, border: `1px solid ${B.border}`, borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: B.muted }}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* PAGE FOOTER */}
      <div style={{ background: B.navy, padding: "16px 24px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#4B5563", fontFamily: "'Courier New', monospace" }}>
          JWH Financial · mortgage-digest@jwhfinance.com · Free · Unsubscribe anytime
        </p>
      </div>
      <div style={{ height: "4px", background: B.blue }} />
    </div>
  );
}
