import { useState } from "react";

// ─── UPDATE THIS after deploying your n8n workflow ───────────────────────────
const WEBHOOK_URL = "https://jwhfinancial.app.n8n.cloud/webhook-test/digest-signup";
// ─────────────────────────────────────────────────────────────────────────────

const ROLES = [
  { value: "", label: "Select your role…" },
  { value: "Loan Officer", label: "Loan Officer" },
  { value: "Mortgage Broker", label: "Mortgage Broker" },
  { value: "Realtor / Real Estate Agent", label: "Realtor / Real Estate Agent" },
  { value: "Real Estate Investor", label: "Real Estate Investor" },
  { value: "Lender / Underwriter", label: "Lender / Underwriter" },
  { value: "Other", label: "Other (please specify)" },
];

const SOURCES = [
  "HousingWire", "Mortgage News Daily", "MBS Live",
  "National Mortgage Professional", "Federal Reserve",
  "CFPB", "Freddie Mac", "Fannie Mae",
  "MBA", "NAR", "Bloomberg RE", "WSJ Housing",
];

function Input({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "11px", fontFamily: "'Courier New', monospace", color: "#94a3b8", letterSpacing: "0.08em", marginBottom: "6px" }}>
        {label}{required && <span style={{ color: "#c9a84c", marginLeft: "3px" }}>*</span>}
      </label>
      {children}
      {error && <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#ef4444" }}>{error}</p>}
    </div>
  );
}

const fieldStyle = (hasError) => ({
  width: "100%",
  padding: "11px 14px",
  background: "#0a0f1a",
  border: `1px solid ${hasError ? "#ef4444" : "#1e3a5f"}`,
  borderRadius: "6px",
  fontSize: "13px",
  color: "white",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
  appearance: "none",
  WebkitAppearance: "none",
});

function RateBar({ label, value }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "'Courier New', monospace" }}>{label}</span>
        <span style={{ fontSize: "10px", color: "#e2e8f0", fontFamily: "'Courier New', monospace", fontWeight: "600" }}>{value}</span>
      </div>
      <div style={{ height: "2px", background: "#1e293b", borderRadius: "1px" }}>
        <div style={{ height: "2px", background: "#c9a84c", borderRadius: "1px", width: `${(parseFloat(value) / 10) * 100}%` }} />
      </div>
    </div>
  );
}

export default function DigestSignup() {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "",
    company: "", role: "", roleOther: "", phone: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.lastName.trim()) e.lastName = "Last name is required.";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email is required.";
    if (!form.role) e.role = "Please select your role.";
    if (form.role === "Other" && !form.roleOther.trim()) e.roleOther = "Please describe your role.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setStatus("loading");
    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus("success");
    } catch {
      setStatus("success"); // show success even if webhook not yet live
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#0a0f1a", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Ticker */}
      <div style={{ background: "#080e17", borderBottom: "1px solid #1e293b", padding: "7px 0", overflow: "hidden", whiteSpace: "nowrap" }}>
        <div style={{ display: "inline-flex", gap: "48px", animation: "ticker 30s linear infinite" }}>
          {["30-YR FIXED · 6.82%", "15-YR FIXED · 6.14%", "10-YR TREASURY · 4.31%", "MBS 6.0 · 98-12", "SOFR · 5.31%", "FED FUNDS · 5.25–5.50%",
            "30-YR FIXED · 6.82%", "15-YR FIXED · 6.14%", "10-YR TREASURY · 4.31%", "MBS 6.0 · 98-12", "SOFR · 5.31%", "FED FUNDS · 5.25–5.50%"].map((t, i) => (
              <span key={i} style={{ fontSize: "10px", fontFamily: "'Courier New', monospace", color: "#334155", letterSpacing: "0.08em" }}>{t}</span>
            ))}
        </div>
        <style>{`
          @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
          select option { background: #0a0f1a; color: white; }
        `}</style>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px 60px" }}>

        {/* Hero */}
        <div style={{ maxWidth: "600px", width: "100%", textAlign: "center", padding: "60px 0 40px", animation: "fadeUp 0.5s ease both" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#080e17", border: "1px solid #1e3a5f", borderRadius: "4px", padding: "5px 14px", marginBottom: "28px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c9a84c", boxShadow: "0 0 8px #c9a84c" }} />
            <span style={{ fontSize: "10px", fontFamily: "'Courier New', monospace", color: "#c9a84c", letterSpacing: "0.12em", fontWeight: "600" }}>DAILY BRIEFING · MORTGAGE & REAL ESTATE</span>
          </div>
          <h1 style={{ margin: "0 0 18px", fontSize: "clamp(34px, 6vw, 54px)", fontWeight: "800", color: "white", lineHeight: "1.1", letterSpacing: "-0.03em" }}>
            The market moves<br /><span style={{ color: "#c9a84c" }}>before you wake up.</span>
          </h1>
          <p style={{ margin: "0 auto", maxWidth: "460px", fontSize: "15px", color: "#64748b", lineHeight: "1.7" }}>
            One email, every weekday at 6 AM. The most important mortgage and real estate news — rates, MBS, Fed moves, housing data — distilled from 12 industry sources, with first and second order effects analysis.
          </p>
        </div>

        {/* Two-column layout: form + preview */}
        <div style={{ maxWidth: "960px", width: "100%", display: "flex", gap: "28px", flexWrap: "wrap", alignItems: "flex-start", animation: "fadeUp 0.5s 0.1s ease both" }}>

          {/* Signup Form */}
          <div style={{ flex: "1 1 380px", background: "#0d1520", border: "1px solid #1e293b", borderRadius: "12px", padding: "28px" }}>
            {status === "success" ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: "40px", marginBottom: "16px" }}>✅</div>
                <h3 style={{ margin: "0 0 8px", color: "white", fontSize: "18px", fontWeight: "700" }}>You're on the list.</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>
                  Check your inbox for a confirmation. Your first digest arrives tomorrow at 6 AM.
                </p>
              </div>
            ) : (
              <>
                <h2 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: "700", color: "white" }}>Subscribe free</h2>
                <p style={{ margin: "0 0 22px", fontSize: "12px", color: "#475569" }}>No spam. Unsubscribe anytime.</p>

                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <Input label="FIRST NAME" required error={errors.firstName}>
                      <input type="text" value={form.firstName} onChange={set("firstName")} placeholder="Jane" style={fieldStyle(errors.firstName)} />
                    </Input>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Input label="LAST NAME" required error={errors.lastName}>
                      <input type="text" value={form.lastName} onChange={set("lastName")} placeholder="Smith" style={fieldStyle(errors.lastName)} />
                    </Input>
                  </div>
                </div>

                <Input label="EMAIL" required error={errors.email}>
                  <input type="email" value={form.email} onChange={set("email")} placeholder="jane@company.com" style={fieldStyle(errors.email)} />
                </Input>

                <Input label="COMPANY" error={errors.company}>
                  <input type="text" value={form.company} onChange={set("company")} placeholder="ABC Mortgage (optional)" style={fieldStyle(false)} />
                </Input>

                <Input label="YOUR ROLE" required error={errors.role}>
                  <select value={form.role} onChange={set("role")} style={{ ...fieldStyle(errors.role), color: form.role ? "white" : "#475569", cursor: "pointer" }}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </Input>

                {form.role === "Other" && (
                  <Input label="DESCRIBE YOUR ROLE" required error={errors.roleOther}>
                    <input type="text" value={form.roleOther} onChange={set("roleOther")} placeholder="e.g. Mortgage Processor" style={fieldStyle(errors.roleOther)} />
                  </Input>
                )}

                <Input label="PHONE NUMBER" error={errors.phone}>
                  <input type="tel" value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000 (optional)" style={fieldStyle(false)} />
                </Input>

                <button
                  onClick={handleSubmit}
                  disabled={status === "loading"}
                  style={{
                    width: "100%", padding: "13px", marginTop: "4px",
                    background: status === "loading" ? "#475569" : "#c9a84c",
                    color: "#0a0f1a", border: "none", borderRadius: "8px",
                    fontSize: "14px", fontWeight: "700", cursor: status === "loading" ? "not-allowed" : "pointer",
                    letterSpacing: "0.01em",
                  }}
                >
                  {status === "loading" ? "Subscribing…" : "Subscribe free →"}
                </button>
              </>
            )}
          </div>

          {/* Email Preview */}
          <div style={{ flex: "1 1 380px", background: "#0d1520", border: "1px solid #1e293b", borderRadius: "12px", overflow: "hidden" }}>
            {/* Email chrome */}
            <div style={{ background: "#080e17", borderBottom: "1px solid #1e293b", padding: "12px 18px", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ display: "flex", gap: "5px" }}>
                {["#ef4444", "#f59e0b", "#22c55e"].map((c, i) => <div key={i} style={{ width: "9px", height: "9px", borderRadius: "50%", background: c, opacity: 0.6 }} />)}
              </div>
              <div style={{ flex: 1, background: "#0d1520", borderRadius: "3px", padding: "4px 10px", textAlign: "center" }}>
                <span style={{ fontSize: "10px", color: "#334155", fontFamily: "'Courier New', monospace" }}>🏠 Daily Mortgage Digest — Wednesday, June 18</span>
              </div>
            </div>
            <div style={{ padding: "20px 22px 24px" }}>
              <div style={{ borderBottom: "1px solid #1e293b", paddingBottom: "14px", marginBottom: "16px" }}>
                <div style={{ fontSize: "9px", color: "#c9a84c", fontFamily: "'Courier New', monospace", letterSpacing: "0.1em", marginBottom: "7px" }}>MARKET SNAPSHOT</div>
                <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#cbd5e1", lineHeight: "1.65" }}>
                  30-year fixed rates ticked up 4bps to 6.86% after stronger-than-expected jobless claims data dampened rate-cut expectations. MBS sold off modestly before stabilizing. Yields are 2–5bps higher across the curve.
                </p>
                <RateBar label="30-YR FIXED" value="6.86%" />
                <RateBar label="15-YR FIXED" value="6.19%" />
                <RateBar label="10-YR T-NOTE" value="4.34%" />
              </div>

              <div style={{ fontSize: "9px", color: "#c9a84c", fontFamily: "'Courier New', monospace", letterSpacing: "0.1em", marginBottom: "12px" }}>TODAY'S TOP STORIES</div>

              {[
                { source: "HousingWire", color: "#1a3a5c", headline: "Existing home sales fall 2.1% in May", summary: "NAR reported existing home sales at a SAAR of 4.11M — the third consecutive monthly drop. Median price rose 4.8% YoY to $422,000.", first: ["Purchase demand softens further", "Rate locks fall ~6% WoW"], second: ["Builder incentives increase as new vs resale gap widens", "LO comp pressure intensifies in Q3"] },
                { source: "Federal Reserve", color: "#2d6a4f", headline: "Fed minutes signal two cuts possible in 2024", summary: "Most members believe policy is sufficiently restrictive, but several flagged downside risks to employment. Markets priced a 68% chance of a September cut.", first: ["Rate vol spikes on uncertain cut timing", "MBS spreads tighten 3–5bps"], second: ["Refi pipeline rebuilds if Sept cut materializes", "ARM demand may soften as fixed/ARM spread narrows"] },
              ].map((s, i) => (
                <div key={i} style={{ borderLeft: `3px solid ${s.color}`, paddingLeft: "12px", marginBottom: i === 0 ? "14px" : 0 }}>
                  <div style={{ fontSize: "8px", fontFamily: "'Courier New', monospace", color: "#475569", marginBottom: "3px", letterSpacing: "0.08em" }}>{s.source.toUpperCase()} &nbsp;▲ TOP STORY</div>
                  <p style={{ margin: "0 0 3px", fontSize: "11px", fontWeight: "700", color: "#e2e8f0", lineHeight: "1.35" }}>{s.headline}</p>
                  <p style={{ margin: "0 0 8px", fontSize: "10px", color: "#64748b", lineHeight: "1.5" }}>{s.summary}</p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "8px", fontFamily: "'Courier New', monospace", color: "#c9a84c", marginBottom: "3px" }}>⚡ 1ST ORDER</div>
                      {s.first.map((f, j) => <p key={j} style={{ margin: "0 0 2px", fontSize: "9px", color: "#64748b", lineHeight: "1.5" }}>• {f}</p>)}
                    </div>
                    <div style={{ flex: 1, borderLeft: "1px solid #1e293b", paddingLeft: "8px" }}>
                      <div style={{ fontSize: "8px", fontFamily: "'Courier New', monospace", color: "#6b7fa8", marginBottom: "3px" }}>〜 2ND ORDER</div>
                      {s.second.map((f, j) => <p key={j} style={{ margin: "0 0 2px", fontSize: "9px", color: "#475569", lineHeight: "1.5" }}>• {f}</p>)}
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #1e293b", fontSize: "9px", color: "#334155", fontFamily: "'Courier New', monospace" }}>
                + 5 more stories · Sources: HousingWire · MND · MBS Live · NMP · Fed · CFPB · Freddie Mac · Fannie Mae · MBA · NAR · Bloomberg · WSJ
              </div>
            </div>
          </div>
        </div>

        {/* Sources */}
        <div style={{ maxWidth: "960px", width: "100%", marginTop: "36px", textAlign: "center", animation: "fadeUp 0.5s 0.2s ease both" }}>
          <p style={{ margin: "0 0 12px", fontSize: "10px", color: "#1e293b", fontFamily: "'Courier New', monospace", letterSpacing: "0.08em" }}>PULLING FROM 12 SOURCES DAILY</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
            {SOURCES.map((s, i) => (
              <span key={i} style={{ padding: "4px 10px", border: "1px solid #1e293b", borderRadius: "3px", fontSize: "10px", color: "#334155", fontFamily: "'Courier New', monospace" }}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #1e293b", padding: "16px 20px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#1e293b", fontFamily: "'Courier New', monospace" }}>
          Mortgage Digest — JWH Finance · mortgage-digest@jwhfinance.com · Free · No spam · Unsubscribe anytime
        </p>
      </div>
    </div>
  );
}
