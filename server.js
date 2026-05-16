require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");

const app = express();

const PORT = process.env.PORT || 3000;

// ================= MIDDLEWARE =================
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

// ================= PDF FOLDER =================
const pdfFolder = path.join(__dirname, "pdfs");

if (!fs.existsSync(pdfFolder)) {
  fs.mkdirSync(pdfFolder);
}

// ================= DEBUG ENV =================
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log(
  "EMAIL_PASS:",
  process.env.EMAIL_PASS
    ? "EXISTS"
    : "MISSING"
);

console.log("ADMIN_EMAIL:", process.env.ADMIN_EMAIL);

// ================= GMAIL =================
const transporter = nodemailer.createTransport({

  host: "smtp.gmail.com",

  port: 465,

  secure: true,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ================= VERIFY EMAIL =================
transporter.verify((err, success) => {

  if (err) {

    console.log("❌ EMAIL VERIFY ERROR:");
    console.log(err);

  } else {

    console.log("✅ EMAIL READY");
  }
});

// ================= SUBMIT =================
app.post("/submit", async (req, res) => {

  try {

    console.log("📩 FORM RECEIVED");

    const {
      name,
      ic,
      email,
      phone,
      position,
      address,
      signature,
    } = req.body;

    // ================= VALIDATION =================
    if (
      !name ||
      !ic ||
      !email ||
      !phone ||
      !position ||
      !address ||
      !signature
    ) {

      console.log("❌ VALIDATION FAILED");

      return res
        .status(400)
        .send("❌ Data tidak lengkap");
    }

    const timestamp = Date.now();

    const safeName = name.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    );

    const filename =
      `${safeName}_${timestamp}.pdf`;

    const pdfPath = path.join(
      pdfFolder,
      filename
    );

    // ================= SAVE SIGNATURE =================
    console.log("✍️ SAVING SIGNATURE");

    const signatureBase64 =
      signature.replace(
        /^data:image\/png;base64,/,
        ""
      );

    const signaturePath = path.join(
      __dirname,
      `signature_${timestamp}.png`
    );

    fs.writeFileSync(
      signaturePath,
      Buffer.from(signatureBase64, "base64")
    );

    console.log("✅ SIGNATURE SAVED");

    // ================= CREATE PDF =================
    console.log("📄 CREATING PDF");

    await new Promise((resolve, reject) => {

      const doc = new PDFDocument();

      const stream =
        fs.createWriteStream(pdfPath);

      doc.pipe(stream);

      // TITLE
      doc
        .fontSize(20)
        .text("BORANG TANDATANGAN", {
          align: "center",
        });

      doc.moveDown(2);

      // CONTENT
      doc.fontSize(12);

      doc.text(`Nama: ${name}`);
      doc.moveDown();

      doc.text(`IC: ${ic}`);
      doc.moveDown();

      doc.text(`Email: ${email}`);
      doc.moveDown();

      doc.text(`Telefon: ${phone}`);
      doc.moveDown();

      doc.text(`Jawatan: ${position}`);
      doc.moveDown();

      doc.text("Alamat:");
      doc.text(address);

      doc.moveDown(2);

      doc.text("Tandatangan:");

      doc.image(signaturePath, {
        width: 200,
      });

      doc.end();

      stream.on("finish", () => {

        console.log("✅ PDF CREATED");

        resolve();
      });

      stream.on("error", (err) => {

        console.log("❌ PDF ERROR:");
        console.log(err);

        reject(err);
      });
    });

    // ================= SEND EMAIL =================
    try {

      console.log("📤 TRYING TO SEND EMAIL");

      const info = await transporter.sendMail({

        from: `"ZGG System" <${process.env.EMAIL_USER}>`,

        to: email,

        cc: process.env.ADMIN_EMAIL,

        subject: "Salinan Borang Tanda Tangan",

        html: `
          <h2>Terima kasih ${name}</h2>

          <p>
            Borang anda telah berjaya diterima.
          </p>

          <p>
            PDF dilampirkan bersama email ini.
          </p>
        `,

        attachments: [
          {
            filename: filename,
            path: pdfPath,
          },
        ],
      });

      console.log("✅ EMAIL SENT SUCCESS");
      console.log(info);

    } catch (emailErr) {

      console.log("❌ EMAIL SEND ERROR FULL:");
      console.log(emailErr);

      return res
        .status(500)
        .send("❌ Gagal hantar email");
    }

    // ================= DELETE TEMP FILE =================
    if (fs.existsSync(signaturePath)) {

      fs.unlinkSync(signaturePath);

      console.log("🗑️ TEMP SIGNATURE DELETED");
    }

    return res.send(
      "✅ Berjaya hantar & email dihantar!"
    );

  } catch (err) {

    console.log("❌ SERVER ERROR FULL:");
    console.log(err);

    return res
      .status(500)
      .send("❌ Server error");
  }
});

// ================= TEST EMAIL =================
app.get("/test-email", async (req, res) => {

  try {

    console.log("🧪 TEST EMAIL START");

    const info = await transporter.sendMail({

      from: `"ZGG System" <${process.env.EMAIL_USER}>`,

      to: process.env.ADMIN_EMAIL,

      subject: "TEST EMAIL ZGG SYSTEM",

      html: `
        <h1>TEST EMAIL</h1>

        <p>
          Kalau email ni sampai,
          Gmail App Password dah okay.
        </p>
      `,
    });

    console.log("✅ TEST EMAIL SUCCESS");
    console.log(info);

    res.send("✅ TEST EMAIL SUCCESS");

  } catch (err) {

    console.log("❌ TEST EMAIL ERROR FULL:");
    console.log(err);

    res.status(500).send("❌ TEST EMAIL FAIL");
  }
});

// ================= START =================
app.listen(PORT, () => {

  console.log(`
🚀 SERVER RUNNING

http://localhost:${PORT}
  `);
});