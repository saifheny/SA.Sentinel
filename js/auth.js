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
  provider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  db,
  ref,
  get,
  set,
  update,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  const viewLogin = document.getElementById("view-login");
  const viewRegister = document.getElementById("view-register");
  const viewSetup = document.getElementById("view-setup");
  const loader = document.getElementById("global-loader");

  const btnLoginGoogle = document.getElementById("btn-login-google");
  const btnRegGoogle = document.getElementById("btn-reg-google");
  const btnLoginEmail = document.getElementById("btn-login-email");
  const btnRegisterEmail = document.getElementById("btn-register-email");
  const btnSaveProfile = document.getElementById("btn-save-profile");

  const linkToRegister = document.getElementById("link-to-register");
  const linkToLogin = document.getElementById("link-to-login");

  const inputLoginEmail = document.getElementById("login-email");
  const inputLoginPass = document.getElementById("login-pass");
  const inputRegEmail = document.getElementById("reg-email");
  const inputRegPass = document.getElementById("reg-pass");
  const inputFullname = document.getElementById("user-fullname");

  const roleCards = document.querySelectorAll(".role-option");

  let currentRole = "teacher";
  let currentUser = null;

  roleCards.forEach((card) => {
    card.addEventListener("click", () => {
      roleCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      currentRole = card.dataset.role;
      const toggleWrap = document.querySelector(".role-toggle");
      if (toggleWrap) toggleWrap.setAttribute("data-active", currentRole);
    });
  });

  linkToRegister.addEventListener("click", () => {
    viewLogin.style.display = "none";
    viewRegister.style.display = "block";
  });

  linkToLogin.addEventListener("click", () => {
    viewRegister.style.display = "none";
    viewLogin.style.display = "block";
  });

  const btnBackSetup = document.getElementById("btn-back-setup");
  if (btnBackSetup) {
    btnBackSetup.addEventListener("click", () => {
      viewSetup.style.display = "none";
      viewLogin.style.display = "block";
      signOut(auth);
    });
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      try {
        const userSnap = await get(ref(db, "users/" + user.uid));
        if (userSnap.exists()) {
          const userData = userSnap.val();
          const urlParams = new URLSearchParams(window.location.search);

          if (
            userData.role &&
            userData.name &&
            urlParams.get("action") !== "edit_name"
          ) {
            redirectUser(userData.role, userData.name, user.uid);
            return;
          }

          if (urlParams.get("action") === "edit_name") {
            currentRole = userData.role || "teacher";
            const toggleWrap = document.querySelector(".role-toggle");
            if (toggleWrap) {
              toggleWrap.style.display = "none";
            }
            document.querySelector("#view-setup .auth-title").textContent =
              "غير اسمك";
            document.querySelector("#view-setup .auth-sub").textContent =
              "اكتب اسمك الجديد اللي عايزه يظهر في المنصة.";
          }
        }

        loader.style.opacity = "0";
        setTimeout(() => (loader.style.display = "none"), 500);
        viewLogin.style.display = "none";
        viewRegister.style.display = "none";
        viewSetup.style.display = "block";
        inputFullname.value = user.displayName || "";
      } catch (err) {
        console.error("Error fetching user data:", err);
        loader.style.opacity = "0";
        setTimeout(() => (loader.style.display = "none"), 500);
      }
    } else {
      loader.style.opacity = "0";
      setTimeout(() => (loader.style.display = "none"), 500);
      viewLogin.style.display = "block";
      viewRegister.style.display = "none";
      viewSetup.style.display = "none";
    }
  });

  const handleGoogleAuth = (btn) => {
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    signInWithPopup(auth, provider).catch((err) => {
      console.error(err);
      btn.disabled = false;
      btn.innerHTML = originalHtml;
      showToast("حصلت مشكلة في الدخول بحساب جوجل", "warn");
    });
  };

  btnLoginGoogle.addEventListener("click", () =>
    handleGoogleAuth(btnLoginGoogle),
  );
  btnRegGoogle.addEventListener("click", () => handleGoogleAuth(btnRegGoogle));

  btnLoginEmail.addEventListener("click", () => {
    const email = inputLoginEmail.value.trim();
    const pass = inputLoginPass.value;
    if (!email || !pass) return showToast("برجاء إدخال البريد والباسورد", "warn");

    btnLoginEmail.disabled = true;

    signInWithEmailAndPassword(auth, email, pass).catch((err) => {
      btnLoginEmail.disabled = false;
      btnLoginEmail.textContent = "سجل دخول";
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        showToast("الإيميل أو الباسورد غير صحيحة", "warn");
      } else {
        showToast("خطأ في سجل دخول: " + err.message, "warn");
      }
    });
  });

  btnRegisterEmail.addEventListener("click", () => {
    const email = inputRegEmail.value.trim();
    const pass = inputRegPass.value;
    if (!email) return showToast("برجاء كتابة إيميل صحيح", "warn");
    if (pass.length < 6)
      return showToast("كلمة المرور لازم تكون 6 أحرف على الأقل", "warn");
    if (!/[a-zA-Z]/.test(pass))
      return showToast("كلمة المرور لازم تحتوي على حرف واحد على الأقل (a-z)", "warn");
    if (!/[0-9]/.test(pass))
      return showToast("كلمة المرور لازم تحتوي على رقم واحد على الأقل (0-9)", "warn");
    if (!/[^a-zA-Z0-9]/.test(pass))
      return showToast("كلمة المرور لازم تحتوي على رمز واحد على الأقل (مثل @ # %)", "warn");

    btnRegisterEmail.disabled = true;

    createUserWithEmailAndPassword(auth, email, pass).catch((err) => {
      btnRegisterEmail.disabled = false;
      btnRegisterEmail.textContent = "إنشاء الحساب";
      if (err.code === "auth/email-already-in-use") {
        showToast("الإيميل ده مسجل بيه حساب قبل كده", "warn");
      } else {
        showToast("خطأ في إنشاء الحساب: " + err.message, "warn");
      }
    });
  });

  btnSaveProfile.addEventListener("click", async () => {
    const name = inputFullname.value.trim();
    if (name.split(" ").filter(w => w.length > 0).length < 3) {
      showToast("اكتب اسمك الثلاثي على الأقل (مثال: أحمد محمد علي)", "warn");
      return;
    }

    btnSaveProfile.disabled = true;

    try {
      await update(ref(db, "users/" + currentUser.uid), {
        name: name,
        role: currentRole,
        email: currentUser.email || "no-email",
        lastLogin: Date.now(),
      });
      redirectUser(currentRole, name, currentUser.uid);
    } catch (err) {
      console.error("Error saving profile:", err);
      showToast("حصلت مشكلة في الحفظ", "warn");
      btnSaveProfile.disabled = false;
      btnSaveProfile.innerHTML = "أكد وادخل";
    }
  });

  function redirectUser(role, name, uid) {
    if (role === "teacher") {
      localStorage.setItem("teacherId", uid);
      localStorage.setItem("teacherName", name);
    } else {
      localStorage.setItem("studentId", uid);
      localStorage.setItem("studentName", name);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get("return");

    if (returnUrl) {
      window.location.replace(decodeURIComponent(returnUrl));
    } else {
      if (role === "teacher") {
        window.location.replace("teacher.html");
      } else {
        const pendingExam = localStorage.getItem("sa_pending_exam_id");
        if (pendingExam) {
          localStorage.removeItem("sa_pending_exam_id");
          window.location.replace(
            "exam.html?id=" + pendingExam.trim().toUpperCase(),
          );
        } else {
          window.location.replace("student.html");
        }
      }
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
    function setupPass(inputId, boxesId) {
        const input = document.getElementById(inputId);
        const boxes = document.getElementById(boxesId);
        if(!input || !boxes) return;
        
        input.addEventListener('input', () => {
            boxes.innerHTML = '';
            for(let i=0; i<input.value.length; i++) {
                let box = document.createElement('div');
                box.className = 'pass-box';
                boxes.appendChild(box);
            }
        });
    }
    setupPass('login-pass', 'login-pass-boxes');
    setupPass('reg-pass', 'reg-pass-boxes');
});
