// src/js/sys.js

document.addEventListener("DOMContentLoaded", () => {
  // Кнопка "Report Bug" на главной (с доской)
  const reportBtn = document.getElementById("report-bug-btn");
  if (reportBtn) {
    reportBtn.addEventListener("click", () => {
      window.location.href = "report.html";
    });
  }

  // Кнопка "Back to game" на странице репорта
  const backBtn = document.getElementById("back-to-game-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  // Здесь потом можно добавить:
  // - валидацию формы
  // - логирование
  // - интеграцию с ботовыми API и т.д.
});