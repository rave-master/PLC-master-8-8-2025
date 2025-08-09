/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const puppeteer = require("puppeteer");
const logger = require("firebase-functions/logger");

admin.initializeApp();
const db = admin.firestore();

// Set max container limit
functions.setGlobalOptions({ maxInstances: 10 });

// Email transporter setup (Gmail with App Password)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "junery143@gmail.com",           // ✅ your Gmail address
    pass: "qqwd ovbi vujj bkdu",              // ✅ App password, not Gmail login
  },
});

// Schedule to run every Friday at 8:00 AM (Manila Time)
exports.sendWeeklyPDFReport = functions.pubsub
  .schedule("every friday 08:00")
  .timeZone("Asia/Manila")
  .onRun(async (context) => {
    try {
      const snapshot = await db.collection("users").get();
      const users = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          name: data.name || "",
          designation: data.designation || "",
          status: data.weeklyStatus || {},
        });
      });

      // HTML report
      const html = `
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            h2 { color: #2c3e50; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #aaa; padding: 8px; text-align: center; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h2>DENR-PENRO Personnel Weekly Report</h2>
          <p>Date: ${new Date().toLocaleDateString('en-US')}</p>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Designation</th>
                <th>Mon</th>
                <th>Tue</th>
                <th>Wed</th>
                <th>Thu</th>
                <th>Fri</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>${u.name}</td>
                  <td>${u.designation}</td>
                  <td>${u.status.monday || ""}</td>
                  <td>${u.status.tuesday || ""}</td>
                  <td>${u.status.wednesday || ""}</td>
                  <td>${u.status.thursday || ""}</td>
                  <td>${u.status.friday || ""}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </body>
        </html>
      `;

      // Generate PDF
      const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
      await browser.close();

      // Send Email
      const mailOptions = {
        from: '"DENR Locator" <your-email@gmail.com>',
        to: "junery143@gmail.com",
        subject: "📊 Weekly Personnel Status Report",
        text: "Attached is the weekly personnel report in PDF format.",
        attachments: [{
          filename: `Personnel-Report-${new Date().toISOString().split("T")[0]}.pdf`,
          content: pdfBuffer,
        }],
      };

      await transporter.sendMail(mailOptions);
      logger.info("✅ PDF report emailed to junery143@gmail.com");
      return null;

    } catch (err) {
      logger.error("❌ Failed to generate or send report", err);
      throw err;
    }
  });
