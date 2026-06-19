import { useState } from "react";

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
  "HousingWire", "MND", "MBS Live", "Natl Mortgage Pro",
  "Federal Reserve", "CFPB", "Freddie Mac", "Fannie Mae",
  "MBA", "NAR", "Bloomberg", "WSJ",
];

// Brand tokens
const B = {
  navy: "#0D1321",
  blue: "#3B6FE8",
  green: "#22C55E",
  red: "#DC2626",
  pageBg: "#EEF0F5",
  card: "#FFFFFF",
  border: "#E2E5EC",
  text: "#0D1321",
  muted: "#6B7280",
  light: "#9CA3AF",
  effBg: "#EEF2FF",
  effBorder: "#C7D2FE",
};

const inputStyle = (hasErr) => ({
  width: "100%", padding: "11px 14px",
  border: `1.5px solid ${hasErr ? B.red : B.border}`,
  borderRadius: "8px", fontSize: "14px", color: B.text,
  outline: "none", fontFamily: "inherit",
  boxSizing: "border-box", background: B.card,
  appearance: "none", WebkitAppearance: "none",
  transition: "border-color 0.15s",
});

function Field({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: B.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "5px" }}>
        {label}{required && <span style={{ color: B.blue, marginLeft: "3px" }}>*</span>}
      </label>
      {children}
      {error && <p style={{ margin: "4px 0 0", fontSize: "11px", color: B.red }}>{error}</p>}
    </div>
  );
}

function RateRow({ label, value, change, down }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${B.border}` }}>
      <span style={{ fontSize: "11px", fontWeight: "600", color: B.muted, letterSpacing: "0.03em" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: "14px", fontWeight: "700", color: B.text }}>{value}</span>
        <span style={{
          padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: "700",
          fontFamily: "'Courier New', monospace",
          background: down ? "#F0FDF4" : "#FEF2F2",
          color: down ? B.green : B.red,
        }}>{change}</span>
      </div>
    </div>
  );
}

export default function DigestSignup() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", company: "", role: "", roleOther: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address";
    if (!form.role) e.role = "Please select your role";
    if (form.role === "Other" && !form.roleOther.trim()) e.roleOther = "Please describe your role";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setStatus("loading");
    try {
      await fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } catch { }
    setStatus("success");
  };

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif", background: B.pageBg, minHeight: "100vh" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        input:focus, select:focus { border-color: ${B.blue} !important; box-shadow: 0 0 0 3px rgba(59,111,232,0.12); }
        input::placeholder { color: ${B.light}; }
        select option { color: ${B.text}; background: white; }
      `}</style>

      {/* BLUE TOP STRIPE */}
      <div style={{ height: "5px", background: B.blue }} />

      {/* HEADER */}
      <div style={{ background: B.navy, padding: "18px 24px" }}>
        <div style={{ maxWidth: "980px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: "0 0 1px", fontSize: "9px", fontWeight: "700", color: B.blue, letterSpacing: "0.14em", textTransform: "uppercase" }}>JWH Financial · Daily Briefing</p>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.02em" }}>Mortgage Digest</h1>
          </div>
          <div style={{ width: "40px", height: "40px", background: B.blue, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🏠</div>
        </div>
      </div>

      <div style={{ maxWidth: "980px", margin: "0 auto", padding: "36px 20px 60px", animation: "fadeUp 0.45s ease both" }}>

        {/* HERO */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: B.card, border: `1px solid ${B.border}`, borderRadius: "20px", padding: "5px 14px", marginBottom: "18px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: B.green }} />
            <span style={{ fontSize: "11px", fontWeight: "600", color: B.muted }}>Delivered every weekday at 6 AM</span>
          </div>
          <h2 style={{ margin: "0 0 14px", fontSize: "clamp(30px, 5vw, 46px)", fontWeight: "800", color: B.navy, letterSpacing: "-0.03em", lineHeight: "1.1" }}>
            The mortgage market<br />
            <span style={{ color: B.blue }}>summarized before breakfast.</span>
          </h2>
          <p style={{ margin: "0 auto", maxWidth: "420px", fontSize: "15px", color: B.muted, lineHeight: "1.7" }}>
            Rates, MBS, Fed moves, housing data, and effects analysis — distilled from 12 industry sources into one sharp email.
          </p>
        </div>

        {/* TWO COLUMN */}
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-start" }}>

          {/* FORM */}
          <div style={{ flex: "1 1 340px", background: B.card, borderRadius: "14px", border: `1px solid ${B.border}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(13,19,33,0.07)" }}>
            <div style={{ background: B.navy, padding: "16px 20px" }}>
              <p style={{ margin: "0 0 2px", fontSize: "9px", fontWeight: "700", color: B.blue, letterSpacing: "0.12em", textTransform: "uppercase" }}>Subscribe Free</p>
              <p style={{ margin: 0, fontSize: "13px", color: "#9CA3AF" }}>No spam. Unsubscribe anytime.</p>
            </div>

            <div style={{ padding: "20px" }}>
              {status === "success" ? (
                <div style={{ textAlign: "center", padding: "30px 0" }}>
                  <div style={{ width: "52px", height: "52px", background: "#F0FDF4", border: `2px solid ${B.green}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "22px" }}>✅</div>
                  <h3 style={{ margin: "0 0 8px", color: B.navy, fontSize: "18px", fontWeight: "700" }}>You're on the list.</h3>
                  <p style={{ margin: 0, fontSize: "13px", color: B.muted, lineHeight: "1.65" }}>Check your inbox for a confirmation.<br />First digest arrives tomorrow at 6 AM.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <Field label="First Name" required error={errors.firstName}>
                        <input type="text" value={form.firstName} onChange={set("firstName")} placeholder="Jane" style={inputStyle(errors.firstName)} />
                      </Field>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Field label="Last Name" required error={errors.lastName}>
                        <input type="text" value={form.lastName} onChange={set("lastName")} placeholder="Smith" style={inputStyle(errors.lastName)} />
                      </Field>
                    </div>
                  </div>

                  <Field label="Work Email" required error={errors.email}>
                    <input type="email" value={form.email} onChange={set("email")} placeholder="jane@company.com" style={inputStyle(errors.email)} />
                  </Field>

                  <Field label="Company" error={null}>
                    <input type="text" value={form.company} onChange={set("company")} placeholder="ABC Mortgage (optional)" style={inputStyle(false)} />
                  </Field>

                  <Field label="Your Role" required error={errors.role}>
                    <select value={form.role} onChange={set("role")} style={{ ...inputStyle(errors.role), color: form.role ? B.text : B.light, cursor: "pointer" }}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </Field>

                  {form.role === "Other" && (
                    <Field label="Describe Your Role" required error={errors.roleOther}>
                      <input type="text" value={form.roleOther} onChange={set("roleOther")} placeholder="e.g. Mortgage Processor" style={inputStyle(errors.roleOther)} />
                    </Field>
                  )}

                  <Field label="Phone Number" error={null}>
                    <input type="tel" value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000 (optional)" style={inputStyle(false)} />
                  </Field>

                  <button
                    onClick={handleSubmit}
                    disabled={status === "loading"}
                    style={{
                      width: "100%", padding: "13px 20px", marginTop: "4px",
                      background: status === "loading" ? B.light : B.blue,
                      color: "white", border: "none", borderRadius: "8px",
                      fontSize: "14px", fontWeight: "700",
                      cursor: status === "loading" ? "not-allowed" : "pointer",
                      letterSpacing: "0.01em", transition: "background 0.15s",
                    }}
                  >
                    {status === "loading" ? "Subscribing…" : "Subscribe free →"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* EMAIL PREVIEW */}
          <div style={{ flex: "1 1 380px", background: B.card, borderRadius: "14px", border: `1px solid ${B.border}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(13,19,33,0.07)" }}>
            {/* Email chrome */}
            <div style={{ background: "#F9FAFB", borderBottom: `1px solid ${B.border}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", gap: "5px" }}>
                {["#F87171", "#FBBF24", "#34D399"].map((c, i) => <div key={i} style={{ width: "9px", height: "9px", borderRadius: "50%", background: c }} />)}
              </div>
              <div style={{ flex: 1, background: B.card, border: `1px solid ${B.border}`, borderRadius: "4px", padding: "3px 10px", textAlign: "center" }}>
                <span style={{ fontSize: "10px", color: B.muted }}>🏠 Mortgage Digest — Thursday, June 19</span>
              </div>
            </div>

            {/* Blue stripe */}
            <div style={{ height: "4px", background: B.blue }} />

            {/* Email header */}
            <div style={{ background: B.navy, padding: "18px 20px" }}>
              <p style={{ margin: "0 0 2px", fontSize: "8px", fontWeight: "700", color: B.blue, letterSpacing: "0.14em", textTransform: "uppercase" }}>JWH Financial · Daily Briefing · Thu Jun 19</p>
              <p style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "white", letterSpacing: "-0.02em", lineHeight: "1.2" }}>Mortgage &amp; Real Estate Digest</p>
            </div>

            {/* Market snapshot */}
            <div style={{ background: B.card, padding: "16px 20px", borderBottom: `6px solid ${B.pageBg}` }}>
              <p style={{ margin: "0 0 3px", fontSize: "8px", fontWeight: "700", color: B.blue, letterSpacing: "0.12em", textTransform: "uppercase" }}>Market Snapshot</p>
              <p style={{ margin: "0 0 12px", fontSize: "12px", color: B.muted, lineHeight: "1.6" }}>Rates pulled back 6bps after softer PPI data. MBS rallied 12 ticks before giving back half gains on Powell's remarks.</p>
              {SAMPLE_RATES.map((r, i) => <RateRow key={i} {...r} />)}
            </div>

            {/* Stories */}
            <div style={{ background: B.pageBg, padding: "16px 20px" }}>
              <p style={{ margin: "0 0 10px", fontSize: "8px", fontWeight: "700", color: B.blue, letterSpacing: "0.12em", textTransform: "uppercase" }}>Today's Top Stories</p>

              {[
                { source: "Federal Reserve", color: "#065F46", headline: "Powell signals rates staying higher for longer", summary: "Chair Powell pushed back on rate-cut expectations, citing persistent inflation pressures.", isTop: true },
                { source: "HousingWire", color: "#1E3A8A", headline: "Existing sales hit 14-year low as supply crunch deepens", summary: "NAR: SAAR of 3.96M in May. Only 1.08M homes on market — 2.9 months supply.", isTop: true },
                { source: "MBS Live", color: "#C2410C", headline: "MBS spreads tighten 8bps on money manager demand", summary: "30yr current coupon spread over Treasuries tightened to 161bps, tightest since March.", isTop: false },
              ].map((story, i) => (
                <div key={i} style={{ display: "flex", marginBottom: "10px", borderRadius: "8px", overflow: "hidden", border: `1px solid ${B.border}`, boxShadow: "0 1px 2px rgba(13,19,33,0.04)" }}>
                  <div style={{ width: "4px", background: story.color, flexShrink: 0 }} />
                  <div style={{ background: B.card, padding: "10px 12px", flex: 1 }}>
                    <div style={{ marginBottom: "5px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      <span style={{ display: "inline-block", padding: "2px 8px", background: story.color, color: "white", fontSize: "8px", fontWeight: "700", borderRadius: "20px", letterSpacing: "0.06em", textTransform: "uppercase" }}>{story.source}</span>
                      {story.isTop && <span style={{ display: "inline-block", padding: "2px 8px", background: B.blue, color: "white", fontSize: "8px", fontWeight: "700", borderRadius: "20px" }}>★ Top Story</span>}
                    </div>
                    <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: "700", color: B.navy, lineHeight: "1.3" }}>{story.headline}</p>
                    <p style={{ margin: 0, fontSize: "11px", color: B.muted, lineHeight: "1.5" }}>{story.summary}</p>
                  </div>
                </div>
              ))}

              <p style={{ margin: "6px 0 0", fontSize: "9px", color: B.light, textAlign: "center" }}>+ effects analysis and what to watch in every digest</p>
            </div>

            {/* Footer */}
            <div style={{ background: B.navy, padding: "12px 20px", textAlign: "center" }}>
              <p style={{ margin: "0 0 2px", fontSize: "11px", fontWeight: "700", color: "white" }}>JWH Financial · Mortgage Digest</p>
              <p style={{ margin: 0, fontSize: "9px", color: B.light, fontFamily: "'Courier New', monospace" }}>mortgage-digest@jwhfinance.com</p>
            </div>
            <div style={{ height: "3px", background: B.blue }} />
          </div>
        </div>

        {/* SOURCES */}
        <div style={{ marginTop: "36px", textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontSize: "9px", fontWeight: "700", color: B.light, letterSpacing: "0.1em", textTransform: "uppercase" }}>Pulling from 12 sources daily</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
            {SOURCES.map((s, i) => (
              <span key={i} style={{ padding: "4px 12px", background: B.card, border: `1px solid ${B.border}`, borderRadius: "20px", fontSize: "11px", fontWeight: "600", color: B.muted }}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ background: B.navy, padding: "16px 20px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#4B5563", fontFamily: "'Courier New', monospace" }}>
          JWH Financial · mortgage-digest@jwhfinance.com · Free · Unsubscribe anytime
        </p>
      </div>
      <div style={{ height: "4px", background: B.blue }} />
    </div>
  );
}
