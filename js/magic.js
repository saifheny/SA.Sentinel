/**
 *          ▄▄██████▄▄
 *        ▄████████████▄
 *       ▄████▀    ▀████▄
 *      ▄████   SA   ████▄
 *      ████          ████
 *      ▀████   TM   ████▀
 *       ▀████▄    ▄████▀
 *        ▀████████████▀
 *          ▀▀██████▀▀
 *     SA SAFE EXAM PLATFORM
 *  ───────────────────────────
 *   INTERNAL BRAND SIGNATURE
 *     ALL RIGHTS RESERVED
 */
document.addEventListener("DOMContentLoaded", () => {
  const logo = document.getElementById("logo-easter-egg");
  if (logo) {
    // logo click — no action
  }
  const konamiCode = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ];
  let konamiIndex = 0;
  document.addEventListener("keydown", (e) => {
    if (
      e.key.toLowerCase() === konamiCode[konamiIndex].toLowerCase() ||
      e.key === konamiCode[konamiIndex]
    ) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        activateMatrixMode();
        konamiIndex = 0;
      }
    } else {
      konamiIndex = 0;
    }
  });
});

function activateMatrixMode() {
  document.documentElement.style.setProperty("--accent", "#22c55e");
  document.documentElement.style.setProperty("--blue", "#16a34a");
  document.documentElement.style.setProperty(
    "--accent-glow",
    "rgba(34, 197, 94, 0.6)",
  );
  document.documentElement.style.setProperty("--bg", "#000000");
  showMagicToast("👨‍💻 تم تفعيل وضع الهاكر!");
  const orbs = document.querySelectorAll(".ambient-orb");
  orbs.forEach((orb) => {
    orb.style.borderRadius = "0";
    orb.style.animationDuration = "2s";
    orb.style.filter = "blur(20px)";
  });
}
function showMagicToast(message) {
  let toast = document.createElement("div");
  toast.innerHTML = message;
  toast.style.position = "fixed";
  toast.style.top = "20px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%) translateY(-50px)";
  toast.style.background = "var(--glass2)";
  toast.style.color = "#fff";
  toast.style.padding = "12px 24px";
  toast.style.borderRadius = "99px";
  toast.style.boxShadow = "0 10px 30px var(--accent-glow)";
  toast.style.zIndex = "9999";
  toast.style.fontWeight = "bold";
  toast.style.opacity = "0";
  toast.style.transition = "all 0.5s var(--spring)";
  toast.style.backdropFilter = "blur(10px)";
  toast.style.border = "1px solid var(--accent)";
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transform = "translateX(-50%) translateY(0)";
    toast.style.opacity = "1";
  }, 100);
  setTimeout(() => {
    toast.style.transform = "translateX(-50%) translateY(-50px)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Trigger the browser's native install prompt directly
  setTimeout(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        deferredPrompt = null;
      }
    }
  }, 2000);
});

window.showToast = function(message, type = 'ok') {
  let toastArea = document.querySelector('.toast-area');
  if (!toastArea) {
    toastArea = document.createElement('div');
    toastArea.className = 'toast-area';
    document.body.appendChild(toastArea);
  }
  
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  
  const icon = type === 'ok' ? 'fa-check-circle' : type === 'bad' ? 'fa-times-circle' : 'fa-exclamation-circle';
  
  toast.innerHTML = '<i class="fa-solid ' + icon + '"></i> <span>' + message + '</span>';
  toastArea.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.4s forwards';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
};

window.customConfirm = function(message, onConfirm) {
  const modalBg = document.createElement('div');
  modalBg.className = 'modal-bg active';
  modalBg.style.zIndex = '99999';
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  modal.innerHTML = '<div class="modal-ic warn"><i class="fa-solid fa-question"></i></div><h2 style="text-align:center">تأكيد</h2><p style="text-align:center">' + message + '</p><div class="modal-btns"><button class="btn btn-red" id="confirm-yes">نعم</button><button class="btn btn-soft" id="confirm-no">إلغاء</button></div>';
  
  modalBg.appendChild(modal);
  document.body.appendChild(modalBg);
  
  document.getElementById('confirm-yes').onclick = () => {
    modalBg.remove();
    if(onConfirm) onConfirm();
  };
  document.getElementById('confirm-no').onclick = () => {
    modalBg.remove();
  };
};
