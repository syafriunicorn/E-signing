const canvas = document.getElementById("signature-pad");

const signaturePad = new SignaturePad(canvas);

const form = document.getElementById("signature-form");

const clearButton = document.getElementById("clear");

const responseDiv = document.getElementById("response");

// ================= RESIZE CANVAS =================
function resizeCanvas() {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);

  canvas.width = canvas.offsetWidth * ratio;
  canvas.height = canvas.offsetHeight * ratio;

  canvas.getContext("2d").scale(ratio, ratio);

  signaturePad.clear();
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();

// ================= CLEAR SIGNATURE =================
clearButton.addEventListener("click", () => {
  signaturePad.clear();
});

// ================= FORM SUBMIT =================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // check signature
  if (signaturePad.isEmpty()) {
    responseDiv.innerText =
      "❌ Sila buat tandatangan dahulu.";

    return;
  }

  // get form data
  const formData = new FormData(form);

  const data = Object.fromEntries(formData.entries());

  // add signature image
  data.signature = signaturePad.toDataURL("image/png");

  try {
    responseDiv.innerText = "⏳ Sedang menghantar...";

    const response = await fetch("/submit", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(data),
    });

    const result = await response.text();

    responseDiv.innerText = result;

    // reset form
    form.reset();

    signaturePad.clear();
  } catch (err) {
    console.error(err);

    responseDiv.innerText =
      "❌ Ralat semasa menghantar borang.";
  }
});