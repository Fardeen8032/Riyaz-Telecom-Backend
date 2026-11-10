const sendBrevoEmail = async ({ recipientEmail, subject, htmlContent, textContent }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Riyaz Telecom";

  if (!apiKey || !senderEmail) {
    throw new Error("Brevo email configuration is missing.");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: recipientEmail,
        },
      ],
      subject,
      htmlContent,
      textContent,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorDetails = await response.text();

    throw new Error(
      `Brevo email delivery failed (${response.status}): ${errorDetails}`
    );
  }

  return response.json();
};

export default sendBrevoEmail;