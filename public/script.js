const canvas = document.getElementById("signature-pad");

console.log("SCRIPT LOADED");

const signaturePad = new SignaturePad(canvas);

const form = document.getElementById("signature-form");

const clearButton = document.getElementById("clear");

const responseDiv = document.getElementById("response");

// ================= RESIZE =================
function resizeCanvas() {

  const ratio = Math.max(
    window.devicePixelRatio || 1,
    1
  );

  canvas.width = canvas.offsetWidth * ratio;

  canvas.height = canvas.offsetHeight * ratio;

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

// ================= CLEAR =================
clearButton.addEventListener(
  "click",
  () => {
    signaturePad.clear();
  }
);

// ================= SUBMIT =================
form.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    console.log("FORM SUBMIT");

    if (signaturePad.isEmpty()) {

      responseDiv.innerText =
        "❌ Sila tandatangan dahulu.";

      return;
    }

    const formData = new FormData(form);

    const data = Object.fromEntries(
      formData.entries()
    );

    data.signature =
      signaturePad.toDataURL("image/png");

    console.log("DATA:", data);

    try {

      responseDiv.innerText =
        "⏳ Sedang menghantar...";

      console.log("SENDING FETCH");

      const response = await fetch(
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

      console.log("RESPONSE:", response);

      const result = await response.text();

      console.log("RESULT:", result);

      responseDiv.innerText = result;

      form.reset();

      signaturePad.clear();

    } catch (err) {

      console.log("FETCH ERROR:");
      console.log(err);

      responseDiv.innerText =
        "❌ Ralat semasa menghantar.";
    }
  }
);