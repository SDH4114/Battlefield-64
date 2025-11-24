document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bug-report-form");
  const statusEl = document.getElementById("status");

  // Если это не report.html – ничего не делаем
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    statusEl.textContent = "Sending...";

    const name = form.name.value;
    const email = form.email.value;
    const message = form.message.value;

    // скриншот → base64
    const file = document.getElementById("screenshot").files[0];
    let screenshotBase64 = "";

    if (file) {
      screenshotBase64 = await toBase64(file);
    }

    // формируем payload
    const payload = {
      name,
      email,
      message,
      screenshot: screenshotBase64
    };

    try {
      const response = await fetch("https://formsubmit.co/ajax/chaos.net2000@gmail.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        statusEl.textContent = "Report sent successfully! Thank you.";
        form.reset();
      } else {
        statusEl.textContent = "Error: formsubmit rejected the request.";
      }
    } catch (error) {
      statusEl.textContent = "Error sending report. Try later.";
      console.error(error);
    }
  });
});

// Helper: file → base64
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}