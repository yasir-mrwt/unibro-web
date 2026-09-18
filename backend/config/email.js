const { Resend } = require("resend");

const REQUIRED_EMAIL_ENV = ["RESEND_API_KEY", "MAIL_FROM", "MAIL_FROM_NAME"];

const cleanDisplayName = (value) =>
  String(value || "")
    .replace(/[\r\n<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatAddress = (email, name) => {
  const displayName = cleanDisplayName(name);
  return displayName ? `${displayName} <${email}>` : email;
};

const extractEmailAddress = (value) => {
  const mailbox = String(value || "").trim();
  const formattedAddress = mailbox.match(/<([^<>]+)>$/);
  return (formattedAddress?.[1] || mailbox).trim();
};

const getEmailConfiguration = (environment = process.env) => {
  const missing = REQUIRED_EMAIL_ENV.filter(
    (name) => !environment[name]?.trim(),
  );
  if (missing.length) {
    throw new Error(`Email service is not configured: ${missing.join(", ")}`);
  }

  const senderEmail = extractEmailAddress(environment.MAIL_FROM);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
    throw new Error("MAIL_FROM must contain a valid email address");
  }

  return {
    apiKey: environment.RESEND_API_KEY.trim(),
    from: formatAddress(senderEmail, environment.MAIL_FROM_NAME),
  };
};

const deliverEmail = async (client, configuration, options) => {
  try {
    const { data, error } = await client.emails.send({
      from: configuration.from,
      to: formatAddress(options.email, options.name),
      subject: options.subject,
      html: options.html,
      text:
        options.text || "Please view this email in an HTML-enabled client.",
    });

    if (error) throw error;
    if (!data?.id) throw new Error("Resend did not return an email ID");

    return { success: true, messageId: data.id };
  } catch (error) {
    const deliveryError = new Error("Email delivery failed");
    deliveryError.cause = error;
    throw deliveryError;
  }
};

const sendEmail = async (options) => {
  const configuration = getEmailConfiguration();
  const client = new Resend(configuration.apiKey);
  return deliverEmail(client, configuration, options);
};

module.exports = {
  sendEmail,
  deliverEmail,
  extractEmailAddress,
  formatAddress,
  getEmailConfiguration,
};
