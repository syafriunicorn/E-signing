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

// ================= FOLDER =================
const pdfFolder = path.join(__dirname, "pdfs");
if (!fs.existsSync(pdfFolder)) {
  fs.mkdirSync(pdfFolder);
}

// ================= DEBUG ENV (IMPORTANT) =================
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS length:", process.env.EMAIL_PASS?.length);

// ================= EMAIL TRANSPORT (FIXED) =================
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// verify email connection
transporter.verify((err, success) => {
  if (err) {
    console.log("❌ EMAIL VERIFY ERROR FULL:");
    console.log(err);
  } else {
    console.log("✅ EMAIL READY OK");
  }
});


// ================= SUBMIT =================
app.post("/submit", async (req, res) => {
  try {
    const { name, ic, email, phone, position, address, signature } = req.body;

    if (!name || !ic || !email || !phone || !position || !address || !signature) {
      return res.status(400).send("❌ Data tidak lengkap");
    }

    const timestamp = Date.now();
    const safeName = name.replace(/\s+/g, "_");

    const filename = `${safeName}_${timestamp}.pdf`;
    const pdfPath = path.join(pdfFolder, filename);

    // ================= SIGNATURE =================
    const signaturePath = path.join(__dirname, `signature_${timestamp}.png`);

    fs.writeFileSync(
      signaturePath,
      Buffer.from(signature.replace(/^data:image\/png;base64,/, ""), "base64")
    );

    // ================= CREATE PDF =================
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    doc.fontSize(18).text("BORANG TANDATANGAN", { align: "center" });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Nama: ${name}`);
    doc.text(`IC: ${ic}`);
    doc.text(`Email: ${email}`);
    doc.text(`Telefon: ${phone}`);
    doc.text(`Jawatan: ${position}`);
    doc.text(`Alamat: ${address}`);

    doc.moveDown();
    doc.text("Tandatangan:");
    doc.image(signaturePath, { width: 200 });

    doc.end();

    // ================= EMAIL AFTER PDF =================
    stream.on("finish", async () => {
      try {
        console.log("📤 Sending email...");

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          cc: process.env.ADMIN_EMAIL,
          subject: "Salinan Borang Tanda Tangan",
          html: `
            <h2>Terima kasih ${name}</h2>
            <p>Borang anda telah diterima.</p>
            <p>PDF dilampirkan.</p>
          `,
          attachments: [
            {
              filename,
              path: pdfPath,
            },
          ],
        });

        fs.unlinkSync(signaturePath);

        console.log("✅ EMAIL SENT SUCCESS");

        return res.send("✅ Berjaya hantar & email dihantar!");
      } catch (err) {
        console.log("❌ EMAIL ERROR:");
        console.log(err.message || err);

        return res.status(500).send("❌ Gagal hantar email (server)");
      }
    });

    stream.on("error", (err) => {
      console.log(err);
      return res.status(500).send("❌ PDF error");
    });

  } catch (err) {
    console.log(err);
    return res.status(500).send("❌ Server error");
  }
});

// ================= START =================
app.listen(PORT, () => {
  console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});

app.get("/test-email", async (req, res) => {
  try {
    console.log("TEST EMAIL START");

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: "TEST EMAIL FROM RENDER",
      text: "Kalau sampai ni maknanya email OK di Render",
    });

    console.log("EMAIL SENT:", info.messageId);

    res.send("EMAIL SUCCESS");
  } catch (err) {
    console.log("EMAIL ERROR FULL:");
    console.log(err);

    res.status(500).send("EMAIL FAIL");
  }
});