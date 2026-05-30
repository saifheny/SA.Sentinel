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
let clickCount = 0;
let lastClickTime = 0;
const REQUIRED_CLICKS = 5;
const TIME_LIMIT = 3000;
document.addEventListener("DOMContentLoaded", () => {
  const logo = document.getElementById("logo-easter-egg");
  if (logo) {
    logo.addEventListener("click", (e) => {
      const currentTime = new Date().getTime();
      if (currentTime - lastClickTime > TIME_LIMIT) {
        clickCount = 0;
      }
      clickCount++;
      lastClickTime = currentTime;
      const ripple = document.createElement("div");
      ripple.style.position = "absolute";
      ripple.style.inset = "0";
      ripple.style.borderRadius = "50%";
      ripple.style.background = "rgba(255,255,255,0.4)";
      ripple.style.transform = "scale(0)";
      ripple.style.transition = "transform 0.4s, opacity 0.4s";
      logo.appendChild(ripple);
      setTimeout(() => {
        ripple.style.transform = "scale(2)";
        ripple.style.opacity = "0";
      }, 10);
      setTimeout(() => ripple.remove(), 400);
      if (clickCount >= REQUIRED_CLICKS) {
        activateProMode();
        clickCount = 0;
      }
    });
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
function activateProMode() {
  document.body.style.transition = "all 1s ease";
  document.documentElement.style.setProperty("--accent", "#fbbf24");
  document.documentElement.style.setProperty("--blue", "#f59e0b");
  document.documentElement.style.setProperty(
    "--accent-glow",
    "rgba(251, 191, 36, 0.4)",
  );
  document.documentElement.style.setProperty("--bg", "#111827");
  showMagicToast("🚀 تم تفعيل وضع المحترفين (Pro Mode)");
}
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
});
function showInstallBanner() {
  if (document.getElementById("install-pwa-banner")) return;
  const banner = document.createElement("div");
  banner.id = "install-pwa-banner";
  banner.style.position = "fixed";
  banner.style.top = "-100px";
  banner.style.left = "50%";
  banner.style.transform = "translateX(-50%)";
  banner.style.background = "rgba(255, 255, 255, 0.95)";
  banner.style.backdropFilter = "blur(10px)";
  banner.style.border = "1px solid var(--border)";
  banner.style.padding = "12px 20px";
  banner.style.borderRadius = "16px";
  banner.style.boxShadow = "0 10px 40px rgba(0,0,0,0.15)";
  banner.style.zIndex = "99999";
  banner.style.display = "flex";
  banner.style.alignItems = "center";
  banner.style.gap = "15px";
  banner.style.transition = "top 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
  banner.style.width = "calc(100% - 30px)";
  banner.style.maxWidth = "400px";
  banner.innerHTML = `
        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--accent), var(--accent2)); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.2rem; flex-shrink: 0;">
            <i class="fa-solid fa-download"></i>
        </div>
        <div style="flex: 1;">
            <div style="font-weight: 800; font-size: 0.95rem; color: var(--text);">ثبت التطبيق دلوقتي</div>
            <div style="font-size: 0.75rem; color: var(--text2);">لتجربة أسرع وأفضل بدون نت!</div>
        </div>
        <button id="btn-install-pwa" style="background: var(--accent); color: #fff; border: none; padding: 6px 14px; border-radius: 99px; font-weight: 800; font-size: 0.8rem; cursor: pointer; white-space: nowrap;">تثبيت</button>
        <button id="btn-close-pwa" style="background: transparent; color: var(--text3); border: none; font-size: 1.2rem; cursor: pointer; padding: 0 5px;"><i class="fa-solid fa-xmark"></i></button>
    `;
  document.body.appendChild(banner);
  document.getElementById("btn-close-pwa").onclick = () => {
    banner.style.top = "-100px";
    setTimeout(() => banner.remove(), 500);
  };
  document.getElementById("btn-install-pwa").onclick = async () => {
    banner.style.top = "-100px";
    setTimeout(() => banner.remove(), 500);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        deferredPrompt = null;
      }
    } else {
      showMagicToast("اضغط على (Add to Home Screen) من إعدادات المتصفح");
    }
  };
  setTimeout(() => {
    banner.style.top = "20px";
  }, 100);
  setTimeout(() => {
    if (document.getElementById("install-pwa-banner")) {
      banner.style.top = "-100px";
      setTimeout(() => {
        if (banner.parentNode) banner.remove();
      }, 500);
    }
  }, 5000);
}
document.addEventListener("DOMContentLoaded", () => {
  if (window.matchMedia("(display-mode: standalone)").matches) return;
  setTimeout(() => {
    showInstallBanner();
    setInterval(() => {
      if (!window.matchMedia("(display-mode: standalone)").matches) {
        showInstallBanner();
      }
    }, 120000);
  }, 2000);
});
