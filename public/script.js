const canvas = document.getElementById("signature-pad");

const signaturePad = new SignaturePad(canvas);

const form = document.getElementById("signature-form");

const clearButton = document.getElementById("clear");

const responseDiv = document.getElementById("response");

const submitButton =
  document.querySelector(".submit-btn");

/* =========================
   RESIZE CANVAS
========================= */
function resizeCanvas() {

  const ratio =
    Math.max(window.devicePixelRatio || 1, 1);

  canvas.width =
    canvas.offsetWidth * ratio;

  canvas.height =
    canvas.offsetHeight * ratio;

  canvas
    .getContext("2d")
    .scale(ratio, ratio);

  signaturePad.clear();
}

window.addEventListener(
  "resize",
  resizeCanvas
);

resizeCanvas();

/* =========================
   CLEAR SIGNATURE
========================= */
clearButton.addEventListener(
  "click",
  () => {

    signaturePad.clear();

    responseDiv.innerText = "";
  }
);

/* =========================
   SHOW RESPONSE
========================= */
function showMessage(message, type = "success") {

  responseDiv.innerText = message;

  if (type === "error") {

    responseDiv.style.color = "#dc2626";

  } else {

    responseDiv.style.color = "#10b981";
  }
}

/* =========================
   SUBMIT FORM
========================= */
form.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    /* VALIDATE SIGNATURE */
    if (signaturePad.isEmpty()) {

      showMessage(
        "❌ Sila lengkapkan tandatangan digital.",
        "error"
      );

      return;
    }

    /* DISABLE BUTTON */
    submitButton.disabled = true;

    submitButton.innerText =
      "Sedang Menghantar...";

    const formData =
      new FormData(form);

    const data =
      Object.fromEntries(
        formData.entries()
      );

    /* ADD SIGNATURE */
    data.signature =
      signaturePad.toDataURL(
        "image/png"
      );

    /* TIMESTAMP */
    data.submittedAt =
      new Date().toISOString();

    try {

      showMessage(
        "⏳ Sedang menghantar..."
      );

      const response =
        await fetch(
          "/submit",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(data),
          }
        );

      /* CHECK RESPONSE */
      if (!response.ok) {

        throw new Error(
          "Server Error"
        );
      }

      const result =
        await response.text();

      showMessage(
        result || "✅ Borang berjaya dihantar."
      );

      /* RESET FORM */
      form.reset();

      signaturePad.clear();

    } catch (error) {

      console.error(error);

      showMessage(
        "❌ Gagal menghantar borang. Sila cuba semula.",
        "error"
      );

    } finally {

      /* ENABLE BUTTON */
      submitButton.disabled = false;

      submitButton.innerText =
        "Hantar Borang";
    }
  }
);