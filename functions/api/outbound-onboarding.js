export async function onRequestPost(context) {
  try {
    const data = await context.request.json();

    const required = [
      "business_name",
      "contact_name",
      "contact_email",
      "caller_id",
      "primary_goal",
      "success_action",
      "offer",
      "lead_source",
      "opt_in",
      "lead_relationship",
      "call_windows",
      "hard_stops"
    ];

    const missing = required.filter(
      k => !data[k] || String(data[k]).trim() === ""
    );

    if (missing.length) {
      return new Response(
        JSON.stringify({ error: `Missing fields: ${missing.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const lines = Object.entries(data)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const emailBody =
`New Outbound AI Agent Onboarding Submission

Submitted at: ${new Date().toISOString()}
Source page: ${data.page || "unknown"}

----------------------------------
${lines}
----------------------------------`;

    const msg = {
      personalizations: [
        {
          to: [{ email: "todd@netresults.ai" }]
        }
      ],
      from: {
        email: "onboarding@netresults.ai",
        name: "NetResults AI"
      },
      subject: `Outbound Agent Onboarding… ${data.business_name}`,
      content: [
        {
          type: "text/plain",
          value: emailBody
        }
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
