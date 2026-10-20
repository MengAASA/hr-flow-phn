import nodemailer, { SendMailOptions } from "nodemailer";
import hbs, { NodemailerExpressHandlebarsOptions } from "nodemailer-express-handlebars";
import path from "path";

const email = process.env.EMAIL;
const pass = process.env.EMAIL_PASS;

const realTransporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false, // Set to false for TLS, which works with port 587
  // Reuse authenticated SMTP connections instead of a fresh TLS handshake and
  // login per email. Capped at 3, Office 365's concurrent-connection limit
  // per mailbox.
  pool: true,
  maxConnections: 3,
  auth: {
    user: email,
    pass,
  },
});

const handlebarOptions: NodemailerExpressHandlebarsOptions = {
  viewEngine: {
    extname: ".hbs", // Note the correct spelling (extname, not extName)
    partialsDir: path.resolve("./emailTemplates/"),
    defaultLayout: false,
  },
  viewPath: path.resolve("./emailTemplates/"),
  extName: ".hbs",
};

realTransporter.use("compile", hbs(handlebarOptions));

// Outside production, never let real notification emails reach real staff
// inboxes. Set EMAIL_TEST_RECIPIENT to redirect everything to one safe test
// address instead (useful for eyeballing templates); leave it unset to just
// log what would have been sent.
const isProduction = process.env.NODE_ENV === "production";
const testRecipient = process.env.EMAIL_TEST_RECIPIENT;

export const transporter = isProduction
  ? realTransporter
  : {
      sendMail: async (mailOptions: SendMailOptions) => {
        if (testRecipient) {
          console.log(
            `[dev email guard] Redirecting email (to: ${mailOptions.to}${mailOptions.cc ? `, cc: ${mailOptions.cc}` : ""}) -> ${testRecipient}`,
          );
          return realTransporter.sendMail({
            ...mailOptions,
            to: testRecipient,
            cc: undefined,
          });
        }
        console.log(
          `[dev email guard] Skipping send outside production. Would have gone to: ${mailOptions.to}${mailOptions.cc ? `, cc: ${mailOptions.cc}` : ""} — subject: "${mailOptions.subject}"`,
        );
        return { messageId: "dev-skip" };
      },
    };

// Sends one email and logs, rather than throws, on failure — for notifications
// that must never fail the request that triggered them. Returning a promise
// lets independent emails go out together via Promise.all.
export function sendMailSafely(
  mailOptions: SendMailOptions,
  failureMessage: string,
): Promise<void> {
  return transporter.sendMail(mailOptions).then(
    () => undefined,
    (mailErr) => {
      console.error(failureMessage, mailErr);
    },
  );
}
