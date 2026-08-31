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
import {
  auth,
  onAuthStateChanged,
  signOut,
  db,
  ref,
  get,
  remove,
  signInWithPopup,
  provider,
} from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  const welcomeTitle = document.getElementById("welcome-title");
  const btnEnterExam = document.getElementById("btn-enter-exam");
  const examCodeInput = document.getElementById("exam-code-input");

  let studentName = localStorage.getItem("studentName");

  if (studentName) {
    setStudentUI(studentName);
  }

  const twText = "هو ده كود، ولا رابط امتحان؟";
  const twEl = document.getElementById("typewriter-text");
  let twIndex = 0;
  if (twEl) {
    twEl.innerHTML = "";
    function typeWriter() {
      if (twIndex < twText.length) {
        twEl.innerHTML += twText.charAt(twIndex);
        twIndex++;
        setTimeout(typeWriter, 50);
      }
    }
    setTimeout(typeWriter, 500);
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userSnap = await get(ref(db, "users/" + user.uid));
        if (userSnap.exists()) {
          const userData = userSnap.val();
          if (userData.role !== "student") {
            window.location.replace("index.html");
            return;
          }
          studentName = userData.name || "طالب";
          localStorage.setItem("studentId", user.uid);
          localStorage.setItem("studentName", studentName);

          const pendingExam = localStorage.getItem("sa_pending_exam_id");
          if (pendingExam) {
            localStorage.removeItem("sa_pending_exam_id");
            window.location.replace(
              "exam.html?id=" + pendingExam.trim().toUpperCase(),
            );
            return;
          }

          setStudentUI(studentName);
        } else {
          window.location.replace("index.html");
        }
      } catch (err) {
        console.error("Error verifying student:", err);
      }
    } else {
      window.location.replace("index.html");
    }
  });

  const accountBtn = document.getElementById("account-btn");
  const accountDropdown = document.getElementById("account-dropdown");

  if (accountBtn && accountDropdown) {
    accountBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      accountDropdown.classList.toggle("show");
    });

    document.addEventListener("click", function (e) {
      if (
        !accountDropdown.contains(e.target) &&
        !e.target.closest("#account-btn")
      ) {
        accountDropdown.classList.remove("show");
      }
    });

    document
      .getElementById("btn-logout")
      .addEventListener("click", function () {
        accountDropdown.classList.remove("show");
        showConfirmModal(
          "خروج",
          "متأكد إنك عايز تخرج من الحساب؟",
          "logout",
          function () {
            signOut(auth).then(() => {
              localStorage.clear();
              window.location.replace("index.html");
            });
          },
        );
      });

    document
      .getElementById("btn-edit-name")
      .addEventListener("click", function () {
        accountDropdown.classList.remove("show");
        showConfirmModal(
          "غير اسمك",
          "عايز تروح لصفحة التسجيل عشان تعدل اسمك؟\nماتقلقش، بياناتك في الحفظ والصون..",
          "edit",
          function () {
            window.location.href = "index.html?action=edit_name";
          },
        );
      });

    document
      .getElementById("btn-delete-account")
      .addEventListener("click", function () {
        accountDropdown.classList.remove("show");
        showConfirmModal(
          "امسح الحساب بالكامل",
          "تنبيه مهم جداً: كل امتحاناتك ودرجاتك وبياناتك هتتمسح من النظام. الخطوة دي مفيش منها رجوع.. متأكد إنك عايز تمسح حسابك خالص؟",
          "delete",
          async function () {
            try {
              if (auth.currentUser) {
                try {
                  const uid = auth.currentUser.uid;
                  await remove(ref(db, "users/" + uid));
                  await auth.currentUser.delete();
                  localStorage.clear();
                  window.location.replace("index.html");
                } catch (err) {
                  if (err.code === "auth/requires-recent-login") {
                    alert(
                      "عشان الأمان، لازم تخرج وتدخل تاني عشان تمسح الحساب.",
                    );
                    await signOut(auth);
                    localStorage.clear();
                    window.location.replace("index.html");
                  } else {
                    throw err;
                  }
                }
              }
            } catch (e) {
              console.error(e);
              alert(
                "حصلت مشكلة وإحنا بنمسح الحساب. ممكن تحتاج تسجل دخول تاني.",
              );
            }
          },
        );
      });
  }

  btnEnterExam.addEventListener("click", () => {
    let code = examCodeInput.value.trim();

    if (
      code.includes("http://") ||
      code.includes("https://") ||
      code.includes("/") ||
      code.includes("?")
    ) {
      try {
        let urlString = code;
        if (
          !urlString.startsWith("http://") &&
          !urlString.startsWith("https://")
        ) {
          urlString = "https://" + urlString;
        }
        const url = new URL(urlString);
        let id = url.searchParams.get("id");
        if (!id && url.hash) {
          id = url.hash.replace("#", "");
        }
        if (id) {
          code = id;
        }
      } catch (e) {
        if (code.includes("?id=")) {
          code = code.split("?id=")[1].split("&")[0].split("#")[0];
        } else if (code.includes("&id=")) {
          code = code.split("&id=")[1].split("&")[0].split("#")[0];
        } else if (code.includes("#")) {
          code = code.split("#")[1];
        }
      }
    }

    if (code.includes("&")) {
      code = code.split("&")[0];
    }
    if (code.includes("?")) {
      code = code.split("?")[0];
    }
    if (code.includes("#")) {
      code = code.split("#")[1] || code.split("#")[0];
    }

    code = code.toUpperCase().trim();

    if (code.length < 5) {
      toast("الكود قصير أوي", "bad");
      return;
    }
    window.location.href = `exam.html?id=${code}`;
  });

  examCodeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      btnEnterExam.click();
    }
  });

  function setStudentUI(name) {
    var nameLabel = document.getElementById("dropdown-user-name");
    if (nameLabel) nameLabel.textContent = name;
    if (welcomeTitle) welcomeTitle.textContent = `يا هلا بيك يا ${name}!`;
  }

  function showConfirmModal(title, msg, type, onConfirm) {
    var modal = document.getElementById("modal-confirm");
    var modalBox = modal.querySelector(".modal");
    if (!modal) return;
    var okBtn = document.getElementById("btn-confirm-ok");
    var cancelBtn = document.getElementById("btn-confirm-cancel");
    var closeBtn = document.getElementById("modal-confirm-x");
    var iconWrap = document.getElementById("modal-confirm-ic");

    document.getElementById("modal-confirm-title").textContent = title;
    document.getElementById("modal-confirm-msg").textContent = msg;

    modalBox.style.maxWidth = "500px";
    modalBox.style.padding = "3rem 2rem";
    if (type === "delete") {
      iconWrap.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
      iconWrap.className = "modal-ic bad";
      okBtn.className = "btn btn-red";
      okBtn.innerHTML = '<i class="fa-solid fa-trash"></i> أيوة، امسح الحساب';
      document.getElementById("modal-confirm-title").style.color = "var(--red)";
    } else if (type === "logout") {
      iconWrap.innerHTML =
        '<i class="fa-solid fa-arrow-right-from-bracket"></i>';
      iconWrap.className = "modal-ic warn";
      okBtn.className = "btn btn-accent";
      okBtn.innerHTML = "خروج";
      document.getElementById("modal-confirm-title").style.color =
        "var(--text)";
    } else {
      iconWrap.innerHTML = '<i class="fa-solid fa-pen"></i>';
      iconWrap.className = "modal-ic ok";
      okBtn.className = "btn btn-green";
      okBtn.innerHTML = "كمل";
      document.getElementById("modal-confirm-title").style.color =
        "var(--text)";
    }

    openModal("modal-confirm");

    var close = function () {
      closeModal("modal-confirm");
      okBtn.removeEventListener("click", okHandler);
      cancelBtn.removeEventListener("click", close);
      closeBtn.removeEventListener("click", close);
      modal.removeEventListener("click", outsideClick);
    };

    var outsideClick = function (e) {
      if (e.target === e.currentTarget) close();
    };

    var okHandler = function () {
      close();
      if (onConfirm) onConfirm();
    };

    okBtn.addEventListener("click", okHandler);
    cancelBtn.addEventListener("click", close);
    closeBtn.addEventListener("click", close);
    modal.addEventListener("click", outsideClick);
  }

  function openModal(id) {
    document.getElementById(id).classList.add("active");
  }

  function closeModal(id) {
    var m = document.getElementById(id);
    var b = m.querySelector(".modal");
    if (b) {
      b.style.animation = "none";
      b.offsetHeight;
      b.style.animation = "modalIn 0.25s var(--ease-out) reverse both";
    }
    setTimeout(function () {
      m.classList.remove("active");
      if (b) b.style.animation = "";
    }, 220);
  }

  function toast(msg, type) {
    type = type || "ok";
    var c = document.getElementById("toast-area");
    if (!c) return;
    var t = document.createElement("div");
    t.className = "toast " + type;
    t.innerHTML =
      '<i class="fa-solid ' +
      (type === "ok" ? "fa-check-circle" : "fa-circle-exclamation") +
      '"></i><span>' +
      msg +
      "</span>";
    c.appendChild(t);
    setTimeout(function () {
      t.style.animation = "toastOut 0.25s var(--ease-out) both";
      setTimeout(function () {
        t.remove();
      }, 260);
    }, 2600);
  }
});
