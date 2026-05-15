require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { Resend } = require("resend");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

const resend = new Resend(process.env.RESEND_API_KEY);

// ================= FOLDER =================
const pdfFolder = path.join(__dirname, "pdfs");
if (!fs.existsSync(pdfFolder)) {
  fs.mkdirSync(pdfFolder);
}

// ================= DEBUG =================
console.log("RESEND READY");

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

    // ================= PDF =================
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

    // ================= EMAIL =================
    stream.on("finish", async () => {
      try {
        console.log("📤 Sending email via Resend...");

        const result = await resend.emails.send({
          from: "ZGG System <onboarding@resend.dev>",

          to: [email, process.env.ADMIN_EMAIL],

          subject: "Salinan Borang Tanda Tangan",

          html: `
            <h2>Terima kasih ${name}</h2>

            <p>Borang anda telah diterima oleh <b>ZGG System</b>.</p>

            <p>Maklumat anda telah berjaya disimpan.</p>
          `,
        });

        console.log("📨 RESEND RESULT:", result);

        // delete temp signature
        if (fs.existsSync(signaturePath)) {
          fs.unlinkSync(signaturePath);
        }

        console.log("✅ EMAIL SENT SUCCESS");

        return res.send(
          "✅ Berjaya hantar & email dihantar!"
        );

      } catch (err) {

        console.log("❌ RESEND ERROR:");
        console.log(err);

        return res
          .status(500)
          .send("❌ Gagal hantar email");
      }
    });

    // ================= PDF ERROR =================
    stream.on("error", (err) => {

      console.log("❌ PDF STREAM ERROR:");
      console.log(err);

      return res
        .status(500)
        .send("❌ PDF error");
    });

  } catch (err) {

    console.log("❌ SERVER ERROR:");
    console.log(err);

    return res
      .status(500)
      .send("❌ Server error");
  }
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});