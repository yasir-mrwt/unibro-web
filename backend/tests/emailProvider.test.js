const test = require("node:test");
const assert = require("node:assert/strict");
const {
  deliverEmail,
  formatAddress,
  getEmailConfiguration,
} = require("../config/email");

test("Resend receives the configured sender and existing email content", async () => {
  let payload;
  const client = {
    emails: {
      send: async (value) => {
        payload = value;
        return { data: { id: "email_test_123" }, error: null };
      },
    },
  };
  const configuration = {
    apiKey: "not-used-by-the-injected-client",
    from: "UniBro <mail@example.test>",
  };

  const result = await deliverEmail(client, configuration, {
    email: "student@example.test",
    name: "Test Student",
    subject: "Verify Your Email - Unibro",
    html: "<p>Verify</p>",
  });

  assert.deepEqual(result, { success: true, messageId: "email_test_123" });
  assert.deepEqual(payload, {
    from: "UniBro <mail@example.test>",
    to: "Test Student <student@example.test>",
    subject: "Verify Your Email - Unibro",
    html: "<p>Verify</p>",
    text: "Please view this email in an HTML-enabled client.",
  });
});

test("Resend API errors remain generic delivery failures", async () => {
  const providerError = { name: "validation_error", message: "Sender rejected" };
  const client = {
    emails: {
      send: async () => ({ data: null, error: providerError }),
    },
  };

  await assert.rejects(
    deliverEmail(client, { from: "UniBro <mail@example.test>" }, {
      email: "student@example.test",
      subject: "Test",
      html: "<p>Test</p>",
    }),
    (error) => {
      assert.equal(error.message, "Email delivery failed");
      assert.equal(error.cause, providerError);
      return true;
    },
  );
});

test("email configuration requires only the Resend variables", () => {
  const configuration = getEmailConfiguration({
    RESEND_API_KEY: "re_test",
    MAIL_FROM: "mail@example.test",
    MAIL_FROM_NAME: "UniBro",
  });
  assert.deepEqual(configuration, {
    apiKey: "re_test",
    from: "UniBro <mail@example.test>",
  });
  assert.deepEqual(
    getEmailConfiguration({
      RESEND_API_KEY: "re_test",
      MAIL_FROM: "Existing Label<mail@example.test>",
      MAIL_FROM_NAME: "UniBro",
    }),
    {
      apiKey: "re_test",
      from: "UniBro <mail@example.test>",
    },
  );
  assert.throws(
    () => getEmailConfiguration({}),
    /RESEND_API_KEY, MAIL_FROM, MAIL_FROM_NAME/,
  );
  assert.equal(
    formatAddress("student@example.test", "Student\r\n<Bcc>"),
    "Student Bcc <student@example.test>",
  );
});
