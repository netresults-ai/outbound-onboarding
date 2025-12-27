export async function onRequestPost(context) {
  try {
    const data = await context.request.json();

    // helpers
    const s = (v) => (v === undefined || v === null ? "" : String(v).trim());

    // required fields for the NEW lean form
    const required = [
      "business_name",
      "website_url",
      "industry",
      "contact_name",
      "timezone",
      "notify_email",
      "notify_mobile",
      "end_goal",
      "success_definition",
      "ai_disclosure",
      "hard_stops",
      "voicemail_action",
      "busy_handling",
      "call_windows"
    ];

    const missing = required.filter((k) => s(data[k]) === "");

    // Conditional requirements for live transfer
    const endGoal = s(data.end_goal);
    const needsTransfer = endGoal === "Transfer to human";

    if (needsTransfer) {
      if (s(data.transfer_person_name) === "") missing.push("transfer_person_name");
      if (s(data.transfer_phone_number) === "") missing.push("transfer_phone_number");
    }

    if (missing.length) {
      return new Response(
        JSON.stringify({ error: `Missing fields: ${missing.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const submittedAt = s(data.submitted_at) || new Date().toISOString();
    const page = s(data.page) || "unknown";

    const section = (title, lines) =>
      `${title}\n${lines.filter(Boolean).map((l) => `• ${l}`).join("\n")}\n`;

    const emailBody =
`New Outbound AI Agent Onboarding Submission

Submitted at: ${submittedAt}
Source page: ${page}

${section("1... Company and notifications", [
  `Business: ${s(data.business_name)}`,
  `Website: ${s(data.website_url)}`,
  `Industry: ${s(data.industry)}`,
  `Primary contact: ${s(data.contact_name)}`,
  `Timezone: ${s(data.timezone)}`,
  s(data.caller_id_display_number) ? `Caller ID display number: ${s(data.caller_id_display_number)}` : "",
  `Notify email: ${s(data.notify_email)}`,
  `Notify mobile: ${s(data.notify_mobile)}`
])}

${section("2... End goal of the call", [
  `End goal: ${s(data.end_goal)}`,
  `Success definition: ${s(data.success_definition)}`
])}

${needsTransfer ? section("3... Human transfer details", [
  `Transfer to: ${s(data.transfer_person_name)}`,
  `Transfer number: ${s(data.transfer_phone_number)}`
]) : ""}

${section("4... Guardrails and compliance", [
  `Lead list confirmed: ${data.lead_list_confirm ? "Yes" : "No"}`,
  `AI disclosure: ${s(data.ai_disclosure)}`,
  `Hard stops: ${s(data.hard_stops)}`
])}

${section("5... Call mechanics", [
  `Voicemail behavior: ${s(data.voicemail_action)}`,
  `If lead is busy: ${s(data.busy_handling)}`,
  `Allowed call windows: ${s(data.call_windows)}`,
  s(data.notes) ? `Notes: ${s(data.notes)}` : ""
])}

Raw JSON (for debugging)
${JSON.stringify(data, null, 2)}
`;

    const msg = {
      personalizations: [
        { to: [{ email: "todd@netresults.ai" }] }
      ],
      from: {
        email: "onboarding@netresults.ai",
        name: "NetResults AI"
      },
      subject: `Outbound Agent Onboarding… ${s(data.business_name)}`,
      content: [
        { type: "text/plain", value: emailBody }
      ]
    };

    const resp = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg)
    });

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(
        JSON.stringify({ error: "Email send failed", details: t }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
