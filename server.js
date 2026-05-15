require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");

const app = express();

const PORT = process.env.PORT || 3001;

// ================= MIDDLEWARE =================
app.use(express.json({ limit: "10mb" }));

app.use(express.static("public"));

// ================= PDF FOLDER =================
const pdfFolder = path.join(__dirname, "pdfs");

if (!fs.existsSync(pdfFolder)) {
  fs.mkdirSync(pdfFolder);
}

// ================= EMAIL =================
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// test email
transporter.verify((err) => {
  if (err) {
    console.log("❌ Email Error");
    console.log(err);
  } else {
    console.log("✅ Email Ready");
  }
});

// ================= SUBMIT =================
app.post("/submit", async (req, res) => {
  try {
    const {
      name,
      ic,
      email,
      phone,
      position,
      address,
      signature,
    } = req.body;

    // validation
    if (
      !name ||
      !ic ||
      !email ||
      !phone ||
      !position ||
      !address ||
      !signature
    ) {
      return res.status(400).send("❌ Data tidak lengkap");
    }

    const timestamp = Date.now();

    const safeName = name.replace(/\s+/g, "_");

    const filename = `${safeName}_${timestamp}.pdf`;

    const pdfPath = path.join(pdfFolder, filename);

    // ================= SAVE SIGNATURE =================
    const signatureData = signature.replace(
      /^data:image\/png;base64,/,
      ""
    );

    const signaturePath = path.join(
      __dirname,
      `signature_${timestamp}.png`
    );

    fs.writeFileSync(
      signaturePath,
      Buffer.from(signatureData, "base64")
    );

    // ================= CREATE PDF =================
    const doc = new PDFDocument();

    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    doc.fontSize(20).text("BORANG TANDATANGAN", {
      align: "center",
    });

    doc.moveDown(2);

    doc.fontSize(12);

    doc.text(`Nama: ${name}`);
    doc.moveDown();

    doc.text(`No IC: ${ic}`);
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

    // ================= PDF FINISH =================
    stream.on("finish", async () => {
      try {
        await transporter.sendMail({
          from: `"BORANG SYSTEM" <${process.env.EMAIL_USER}>`,

          to: email,

          cc: process.env.ADMIN_EMAIL,

          subject: "Salinan Borang Anda",

          html: `
            <h2>Terima kasih ${name}</h2>

            <p>Borang anda berjaya dihantar.</p>

            <p>PDF disertakan bersama email ini.</p>
          `,

          attachments: [
            {
              filename: filename,
              path: pdfPath,
            },
          ],
        });

        // delete temp signature
        if (fs.existsSync(signaturePath)) {
          fs.unlinkSync(signaturePath);
        }

        console.log("✅ Email sent");

        return res.send(
          "✅ Borang berjaya dihantar & email berjaya dihantar."
        );
      } catch (err) {
        console.log(err);

        return res
          .status(500)
          .send("❌ Gagal menghantar email.");
      }
    });

    stream.on("error", (err) => {
      console.log(err);

      return res
        .status(500)
        .send("❌ Error generate PDF.");
    });
  } catch (err) {
    console.log(err);

    return res.status(500).send("❌ Server Error");
  }
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`
🚀 SERVER RUNNING

http://localhost:${PORT}
  `);
});