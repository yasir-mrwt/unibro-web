const Mailjet = require("node-mailjet");

const sendEmail = async (options) => {
  const required = [
    "MAILJET_API_KEY",
    "MAILJET_SECRET_KEY",
    "MAILJET_SENDER_EMAIL",
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Email service is not configured: ${missing.join(", ")}`);
  }

  try {
    const mailjet = Mailjet.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_SECRET_KEY
    );

    const request = mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_SENDER_EMAIL,
            Name: process.env.MAILJET_SENDER_NAME || "UniBro",
          },
          To: [
            {
              Email: options.email,
              Name: options.name || "User",
            },
          ],
          Subject: options.subject,
          HTMLPart: options.html,
          TextPart:
            options.text || "Please view this email in an HTML-enabled client.",
        },
      ],
    });

    const result = await request;
    return {
      success: true,
      messageId: result.body.Messages[0].To[0].MessageID,
    };
  } catch (error) {
    const mailError = new Error("Email delivery failed");
    mailError.cause = error;
    throw mailError;
  }
};

module.exports = { sendEmail };
