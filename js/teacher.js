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
  set,
  push,
  get,
  remove,
  onValue,
  update,
  query,
  orderByChild,
  equalTo,
} from "./firebase-config.js";
var teacherGlobalSettings = { successMessage: "", failMessage: "" };
var questions = [];
var deleteTargetId = null;
var currentExamId = null;
var currentExamData = null;
var editingId = null;
var currentReportLogs = null;
var currentReportStudentName = null;
var teacherId = null;
var GEMINI_KEY = "AIzaSyBrvjg79Vxlc6wAgJwi1OZF37mtDB6TkOA";
var GEMINI_MODEL = "gemini-2.5-flash-preview-04-17";
document.addEventListener("DOMContentLoaded", function () {
  initTeacher();
  initNav();
  addQuestion();
  bindAll();
});
function initTeacher() {
  var id = localStorage.getItem("teacherId");
  if (!id) {
    id =
      "T-" +
      Date.now().toString(36).toUpperCase() +
      Math.random().toString(36).slice(2, 6).toUpperCase();
    localStorage.setItem("teacherId", id);
  }
  teacherId = id;
  onAuthStateChanged(auth, async function (user) {
    if (user) {
      teacherId = user.uid;
      try {
        const userSnap = await get(ref(db, "users/" + user.uid));
        if (userSnap.exists()) {
          const userData = userSnap.val();
          if (userData.role !== "teacher") {
            window.location.replace("index.html");
            return;
          }
          localStorage.setItem("teacherId", user.uid);
          localStorage.setItem("teacherName", userData.name || "معلم");
          if (userData.settings) {
            teacherGlobalSettings = userData.settings;
            if (document.getElementById("global-success-msg"))
              document.getElementById("global-success-msg").value =
                teacherGlobalSettings.successMessage || "";
            if (document.getElementById("global-fail-msg"))
              document.getElementById("global-fail-msg").value =
                teacherGlobalSettings.failMessage || "";
          }
          setTeacherUI(userData.name || "معلم");
          loadExams();
        } else {
          window.location.replace("index.html");
        }
      } catch (err) {
        console.error("Error verifying teacher:", err);
        setTeacherUI(user.displayName || "معلم");
        loadExams();
      }
    } else {
      window.location.replace("index.html");
    }
  });
  const accountBtn = document.getElementById("account-btn");
  if (accountBtn) {
    accountBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      window.location.hash = "profile";
    });
    const btnBackProfile = document.getElementById("btn-back-profile");
    if (btnBackProfile) {
      btnBackProfile.addEventListener("click", function () {
        window.location.hash = "builder";
      });
    }
    const btnLogout = document.getElementById("btn-quick-logout");
    if (btnLogout) {
      btnLogout.addEventListener("click", function () {
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
    }
    const btnEditName = document.getElementById("btn-quick-edit-name");
    if (btnEditName) {
      btnEditName.addEventListener("click", function () {
        var newName = prompt("اكتب اسمك الجديد هنا:");
        if (newName && newName.trim() !== "") {
          update(ref(db, "users/" + teacherId), { name: newName.trim() }).then(
            () => {
              localStorage.setItem("teacherName", newName.trim());
              setTeacherUI(newName.trim());
              toast("تم تحديث الاسم بنجاح", "ok");
            },
          );
        }
      });
    }
    const btnSaveMsgs = document.getElementById("btn-save-global-msgs");
    if (btnSaveMsgs) {
      btnSaveMsgs.addEventListener("click", function () {
        var sMsg = document.getElementById("global-success-msg").value.trim();
        var fMsg = document.getElementById("global-fail-msg").value.trim();
        teacherGlobalSettings.successMessage = sMsg;
        teacherGlobalSettings.failMessage = fMsg;
        var oldBtnContent = btnSaveMsgs.innerHTML;
        btnSaveMsgs.innerHTML =
          '<div class="spin" style="width:18px;height:18px;border-width:2px;margin:0;flex-shrink:0;"></div> بيحفظ...';
        update(
          ref(db, "users/" + teacherId + "/settings"),
          teacherGlobalSettings,
        )
          .then(function () {
            toast(
              "اتحفظت الرسائل بنجاح ✔ هتتطبق على أي امتحان جديد تعمله.",
              "ok",
            );
            btnSaveMsgs.innerHTML = oldBtnContent;
          })
          .catch(function () {
            toast("حصلت مشكلة في الحفظ", "bad");
            btnSaveMsgs.innerHTML = oldBtnContent;
          });
      });
    }
    document
      .getElementById("btn-page-delete-account")
      .addEventListener("click", function () {
        showConfirmModal(
          "امسح الحساب بالكامل",
          "تنبيه مهم جداً: كل امتحاناتك ودرجات طلابك وبياناتك هتتمسح من النظام. الخطوة دي مفيش منها رجوع.. متأكد إنك عايز تمسح حسابك خالص؟",
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
}
function setTeacherUI(name) {
  var nameLabel = document.getElementById("profile-page-name");
  if (nameLabel) nameLabel.textContent = name;
}
function showConfirmModal(title, msg, type, onConfirm) {
  if (typeof type === "function") {
    onConfirm = type;
    type = "default";
  }
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
    iconWrap.innerHTML = '<i class="fa-solid fa-arrow-right-from-bracket"></i>';
    iconWrap.className = "modal-ic warn";
    okBtn.className = "btn btn-accent";
    okBtn.innerHTML = "خروج";
    document.getElementById("modal-confirm-title").style.color = "var(--text)";
  } else if (type === "edit") {
    iconWrap.innerHTML = '<i class="fa-solid fa-pen"></i>';
    iconWrap.className = "modal-ic ok";
    okBtn.className = "btn btn-green";
    okBtn.innerHTML = "كمل";
    document.getElementById("modal-confirm-title").style.color = "var(--text)";
  } else {
    iconWrap.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
    iconWrap.className = "modal-ic warn";
    okBtn.className = "btn btn-accent";
    okBtn.innerHTML = "أيوة متأكد";
    document.getElementById("modal-confirm-title").style.color = "var(--text)";
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
function initNav() {
  document.querySelectorAll(".float-pill[data-view]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      window.location.hash = btn.dataset.view;
    });
  });
  window.addEventListener("hashchange", function () {
    var hash = window.location.hash.substring(1);
    if (hash) {
      goTo(hash);
    } else {
      goTo("exams");
    }
  });
  var initialHash = window.location.hash.substring(1);
  if (initialHash) {
    goTo(initialHash);
  } else {
    var savedView = sessionStorage.getItem("currentView");
    goTo(savedView || "exams");
  }
}
function setNavActive(viewId) {
  document.querySelectorAll(".float-pill[data-view]").forEach(function (b) {
    b.classList.toggle("active", b.dataset.view === viewId);
  });
}
function go(viewId) {
  sessionStorage.setItem("currentView", viewId);
  document.querySelectorAll(".view").forEach(function (s) {
    s.classList.remove("active");
  });
  var el = document.getElementById("view-" + viewId);
  if (!el) return;
  el.classList.add("active");
  window.scrollTo(0, 0);
}
window.goTo = goTo;
function goTo(viewId) {
  setNavActive(viewId);
  go(viewId);
}
function bindAll() {
  var questionsContainer = document.getElementById("questions-container");
  if (questionsContainer) {
    questionsContainer.addEventListener("input", function (e) {
      var target = e.target;
      if (target.classList.contains("q-input")) {
        questions[+target.dataset.q].text = target.value;
      } else if (target.classList.contains("opt-text")) {
        var q = +target.dataset.q,
          o = +target.dataset.o;
        if (questions[q] && questions[q].options[o] !== undefined) {
          questions[q].options[o] = target.value;
        }
      } else if (target.classList.contains("opt-exp")) {
        questions[+target.dataset.q].explanation = target.value;
      }
    });
    questionsContainer.addEventListener("change", function (e) {
      var target = e.target;
      if (target.classList.contains("opt-radio")) {
        questions[+target.dataset.q].correctAnswer = +target.dataset.o;
        renderQ();
      }
    });
    questionsContainer.addEventListener("click", function (e) {
      var target = e.target;
      var optXBtn = target.closest(".opt-x");
      var qDelBtn = target.closest(".q-del");
      var addOptBtn = target.closest(".add-opt");
      var qToggleBtn = target.closest(".q-toggle");
      var toggleExpBtn = target.closest(".toggle-exp");
      if (optXBtn) {
        e.preventDefault();
        removeOpt(+optXBtn.dataset.q, +optXBtn.dataset.o);
      } else if (qDelBtn) {
        e.preventDefault();
        removeQ(+qDelBtn.dataset.q);
      } else if (addOptBtn) {
        e.preventDefault();
        addOpt(+addOptBtn.dataset.q);
      } else if (qToggleBtn) {
        e.preventDefault();
        var qi = +qToggleBtn.dataset.q;
        questions[qi]._collapsed = !questions[qi]._collapsed;
        renderQ();
      } else if (toggleExpBtn) {
        e.preventDefault();
        var qi = +toggleExpBtn.dataset.q;
        questions[qi]._showExp = !questions[qi]._showExp;
        renderQ();
      }
    });
  }
  var lastScrollY = window.scrollY;
  window.addEventListener(
    "scroll",
    function () {
      var header = document.querySelector("header");
      if (!header) return;
      if (window.scrollY > lastScrollY && window.scrollY > 80) {
        header.classList.add("hidden");
      } else {
        header.classList.remove("hidden");
      }
      lastScrollY = window.scrollY;
    },
    { passive: true },
  );
  document
    .getElementById("btn-add-question")
    .addEventListener("click", function () {
      addQuestion();
    });
  document
    .getElementById("btn-upload-exam")
    .addEventListener("click", uploadExam);
  document
    .getElementById("modal-upload-x")
    .addEventListener("click", function () {
      closeModal("modal-upload");
    });
  document.getElementById("btn-copy-link").addEventListener("click", copyLink);
  document.getElementById("modal-del-x").addEventListener("click", function () {
    closeModal("modal-del");
  });
  document
    .getElementById("btn-cancel-del")
    .addEventListener("click", function () {
      closeModal("modal-del");
    });
  document
    .getElementById("modal-attempts-x")
    .addEventListener("click", function () {
      closeModal("modal-student-attempts");
    });
  document.getElementById("btn-confirm-del").addEventListener("click", doDel);
  document
    .getElementById("btn-back-results")
    .addEventListener("click", function () {
      goTo("exams");
    });
  document
    .getElementById("btn-back-report")
    .addEventListener("click", function () {
      if (currentExamId) showResults(currentExamId);
    });
  document
    .getElementById("btn-cancel-edit")
    .addEventListener("click", cancelEdit);
  document
    .getElementById("btn-ai-analyze")
    .addEventListener("click", runAIAnalysis);
  document
    .getElementById("modal-upload")
    .addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal("modal-upload");
    });
  document.getElementById("modal-del").addEventListener("click", function (e) {
    if (e.target === e.currentTarget) closeModal("modal-del");
  });
  document
    .getElementById("btn-warn-info")
    .addEventListener("click", function () {
      var popup = document.getElementById("warn-info-popup");
      popup.style.display = popup.style.display === "none" ? "block" : "none";
    });
  document.addEventListener(
    "focus",
    function (e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        setTimeout(function () {
          e.target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    },
    true,
  );
}
function addQuestion() {
  for (var i = 0; i < questions.length; i++) {
    questions[i]._collapsed = true;
  }
  questions.push({
    type: "mcq", // "mcq" or "essay"
    points: 1, // default points
    image: "", // base64 image
    text: "",
    options: ["", ""],
    correctAnswer: -1,
    explanation: "",
  });
  renderQ();
}
function removeQ(i) {
  if (questions.length <= 1) {
    toast("لازم سؤال واحد على الأقل", "bad");
    return;
  }
  if (
    confirm("متأكد إنك عايز تمسح السؤال (رقم " + (i + 1) + ") وكل خياراته؟")
  ) {
    questions.splice(i, 1);
    renderQ();
  }
}
function addOpt(qi) {
  if (questions[qi].options.length >= 6) {
    toast("أقصى حاجة 6 خيارات", "bad");
    return;
  }
  questions[qi].options.push("");
  renderQ();
}
function removeOpt(qi, oi) {
  if (questions[qi].options.length <= 2) {
    toast("لازم خيارين على الأقل", "bad");
    return;
  }
  if (questions[qi].correctAnswer === oi) questions[qi].correctAnswer = -1;
  else if (questions[qi].correctAnswer > oi) questions[qi].correctAnswer--;
  questions[qi].options.splice(oi, 1);
  renderQ();
}
function renderQ() {
  var c = document.getElementById("questions-container");
  c.innerHTML = "";
  var labels = ["أ", "ب", "ج", "د", "هـ", "و"];
  questions.forEach(function (q, qi) {
    q.type = q.type || "mcq";
    q.points = q.points || 1;
    q.image = q.image || "";
    
    var optsHtml = "";
    if (q.type === "mcq") {
      optsHtml = q.options.map(function (opt, oi) {
        var ok = q.correctAnswer === oi;
        return (
          '<div class="opt' + (ok ? " correct" : "") + '">' +
          '<input type="radio" class="opt-radio" name="ans-' + qi + '" id="ans-' + qi + '-' + oi + '" ' + (ok ? "checked" : "") + ' data-q="' + qi + '" data-o="' + oi + '">' +
          '<span style="font-weight:700;color:var(--text3);font-size:0.72rem;min-width:14px">' + labels[oi] + '</span>' +
          '<input type="text" class="opt-text" name="opt-text-' + qi + '-' + oi + '" id="opt-text-' + qi + '-' + oi + '" placeholder="الخيار ' + labels[oi] + '" value="' + esc(opt) + '" data-q="' + qi + '" data-o="' + oi + '">' +
          '<button class="opt-x" data-q="' + qi + '" data-o="' + oi + '"><i class="fa-solid fa-xmark"></i></button>' +
          '</div>'
        );
      }).join("");
    }
    
    var block = document.createElement("div");
    block.className = "q-block";
    block.style.animationDelay = qi * 0.04 + "s";
    var isCollapsed = q._collapsed ? ' style="display:none;"' : "";
    var toggleIcon = q._collapsed ? "fa-chevron-down" : "fa-chevron-up";
    var qTitleStr = q.text ? q.text.substring(0, 40) + (q.text.length > 40 ? "..." : "") : "سؤال جديد";
    
    var imgPreview = q.image ? '<div style="margin-top:10px; position:relative; display:inline-block;"><img src="' + q.image + '" style="max-height:100px; border-radius:8px; border:1px solid var(--border);"><button class="btn-remove-img" data-q="' + qi + '" style="position:absolute; top:-5px; right:-5px; background:var(--red); color:#fff; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button></div>' : '';

    block.innerHTML =
      '<div class="q-top" style="align-items:center;">' +
      '<div class="q-num" style="display:flex; align-items:center;"><span class="q-badge">' + (qi + 1) + '</span>السؤال ' + (qi + 1) + 
      (q._collapsed ? ' <span style="font-size:0.85rem; color: var(--text3); font-weight:normal; margin-right:15px; background:var(--bg2); padding:4px 10px; border-radius:99px; border:1px solid var(--border);">' + esc(qTitleStr) + '</span>' : '') +
      '</div>' +
      '<div style="display:flex; gap:8px;">' +
      '<button class="icon-btn q-toggle" data-q="' + qi + '" title="تصغير/تكبير" style="border-radius:10px;"><i class="fa-solid ' + toggleIcon + '"></i></button>' +
      '<button class="q-del" data-q="' + qi + '" title="امسح السؤال"><i class="fa-solid fa-eraser"></i></button>' +
      '</div></div>' +
      '<div class="q-body"' + isCollapsed + '>' +
      
      '<div style="display:flex; gap:15px; margin-bottom:15px;">' +
      '<div class="field-wrap" style="flex:1;"><label>نوع السؤال</label>' +
      '<select class="field q-type-select" data-q="' + qi + '">' +
      '<option value="mcq"' + (q.type === 'mcq' ? ' selected' : '') + '>اختياري</option>' +
      '<option value="essay"' + (q.type === 'essay' ? ' selected' : '') + '>مقالي</option>' +
      '</select></div>' +
      
      '<div class="field-wrap" style="flex:1;"><label>الدرجة</label>' +
      '<input type="number" class="field q-points-input" data-q="' + qi + '" value="' + q.points + '" min="1"></div>' +
      
      '<div class="field-wrap" style="flex:1;"><label>صورة للسؤال</label>' +
      '<input type="file" class="field q-img-input" data-q="' + qi + '" accept="image/*" style="font-size:0.8rem; padding: 6px;"></div>' +
      '</div>' + imgPreview +
      
      '<textarea class="q-input" name="q-input-' + qi + '" id="q-input-' + qi + '" data-q="' + qi + '" placeholder="اكتب نص السؤال هنا..." rows="1">' + esc(q.text) + '</textarea>' +
      
      (q.type === 'mcq' ? '<div class="opts">' + optsHtml + '</div>' : '<p style="color:var(--text3); font-size:0.82rem; margin-top:10px;"><i class="fa-solid fa-align-right" style="color:var(--accent);"></i> سيظهر للطالب مربع نصي لكتابة إجابته.</p>') +
      
      (q.type === 'mcq' ?
        '<div style="margin-top: 15px;">' +
        '<button class="btn btn-soft btn-sm toggle-exp" data-q="' + qi + '" style="border-radius: 99px; padding: 6px 14px; font-size: 0.8rem; margin-bottom: 8px;"><i class="fa-solid fa-lightbulb" style="color:var(--orange);"></i> ' + (q._showExp ? "إخفاء التفسير" : "ضيف تفسير للإجابة") + '</button>' +
        '<textarea class="opt-exp field" name="q-exp-' + qi + '" id="q-exp-' + qi + '" data-q="' + qi + '" placeholder="اكتب ليه الإجابة دي هي الصح..." rows="1" style="resize:none; display: ' + (q._showExp ? "block" : "none") + ';">' + esc(q.explanation || "") + '</textarea>' +
        '</div>' +
        '<button class="add-opt" data-q="' + qi + '"' + (q.options.length >= 6 ? ' style="display:none"' : '') + '><i class="fa-solid fa-plus"></i> ضيف خيار</button>'
      : '') +
      '</div>';
    c.appendChild(block);
  });
  bindQEvents();
}

function bindQEvents() {
  document.querySelectorAll(".q-type-select").forEach(el => {
    el.onchange = function() {
      questions[this.dataset.q].type = this.value;
      renderQ();
    };
  });
  document.querySelectorAll(".q-points-input").forEach(el => {
    el.onchange = function() {
      questions[this.dataset.q].points = parseInt(this.value) || 1;
    };
  });
  document.querySelectorAll(".q-img-input").forEach(el => {
    el.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(evt) {
        
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement("canvas");
          var MAX = 800;
          var width = img.width;
          var height = img.height;
          if (width > height) {
            if (width > MAX) { height *= MAX / width; width = MAX; }
          } else {
            if (height > MAX) { width *= MAX / height; height = MAX; }
          }
          canvas.width = width;
          canvas.height = height;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          var dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          
          questions[el.dataset.q].image = dataUrl;
          renderQ();
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    };
  });
  document.querySelectorAll(".btn-remove-img").forEach(el => {
    el.onclick = function() {
      questions[this.dataset.q].image = "";
      renderQ();
    };
  });
}

function startEdit(examId) {
  get(ref(db, "exams/" + examId)).then(function (snap) {
    if (!snap.exists()) {
      toast("الامتحان ده مش موجود", "bad");
      return;
    }
    var data = snap.val();
    editingId = examId;
    document.getElementById("exam-title").value = data.title;
    document.getElementById("exam-duration").value = data.duration;
    document.getElementById("exam-max-attempts").value =
      data.maxAttempts !== undefined ? data.maxAttempts : 1;
    if (document.getElementById("show-correct-toggle")) {
      document.getElementById("show-correct-toggle").checked =
        data.showCorrectToStudent === true;
    }
    if (document.getElementById("exam-warn-mode")) {
      document.getElementById("exam-warn-mode").value =
        data.warnMode || "warn-first";
    }
    questions = data.questions.map(function (q) {
      return {
        type: q.type || "mcq",
        points: q.points || 1,
        image: q.image || "",
        text: q.text,
        options: (q.options || []).slice(),
        correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : -1,
        explanation: q.explanation || "",
        _showExp: !!q.explanation,
      };
    });
    renderQ();
    document.getElementById("editing-banner").classList.remove("hidden");
    document.getElementById("builder-title").textContent = "تعديل الامتحان";
    document.getElementById("builder-desc").textContent =
      "عدل الأسئلة وبعدين احفظ";
    document.getElementById("btn-upload-exam").innerHTML =
      '<i class="fa-solid fa-floppy-disk"></i> احفظ التعديلات';
    goTo("builder");
    toast("حملنا الامتحان عشان تعدله ✔", "ok");
  });
}
function cancelEdit() {
  editingId = null;
  document.getElementById("editing-banner").classList.add("hidden");
  document.getElementById("builder-title").textContent = "امتحان جديد";
  document.getElementById("builder-desc").textContent =
    "ضيف الأسئلة وارفع الامتحان علطول";
  document.getElementById("btn-upload-exam").innerHTML =
    '<i class="fa-solid fa-cloud-arrow-up"></i> ارفع الامتحان';
  document.getElementById("exam-title").value = "";
  document.getElementById("exam-duration").value = "";
  document.getElementById("exam-max-attempts").value = "1";
  if (document.getElementById("exam-warn-mode"))
    document.getElementById("exam-warn-mode").value = "warn-first";
  if (document.getElementById("exam-success-msg"))
    document.getElementById("exam-success-msg").value = "";
  if (document.getElementById("exam-fail-msg"))
    document.getElementById("exam-fail-msg").value = "";
  questions = [];
  addQuestion();
}
async function uploadExam() {
  var title = document.getElementById("exam-title").value.trim();
  var dur = parseInt(document.getElementById("exam-duration").value);
  var maxAttempts = parseInt(
    document.getElementById("exam-max-attempts").value,
  );
  var teacher =
    localStorage.getItem("teacherName") || "\u0645\u0639\u0644\u0645";
  if (!title) {
    toast("اكتب اسم الامتحان", "bad");
    return;
  }
  if (!dur || dur < 1) {
    toast("اكتب مدة صحيحة", "bad");
    return;
  }
  syncDOM();
  for (var i = 0; i < questions.length; i++) {
    var q = questions[i];
    q.type = q.type || "mcq";
    // النص إجباري فقط لو مفيش صورة
    if (!q.text.trim() && !q.image) {
      toast("السؤال " + (i + 1) + " فاضي (اكتب نص أو ارفع صورة)", "bad");
      return;
    }
    // تحقق الخيارات والإجابة فقط للأسئلة الاختيارية
    if (q.type === "mcq") {
      for (var j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) {
          toast("في خيار فاضي في سؤال " + (i + 1), "bad");
          return;
        }
      }
      if (q.correctAnswer === -1) {
        toast("اختار الإجابة الصح للسؤال " + (i + 1), "bad");
        return;
      }
    }
  }
  var data = {
    title: title,
    duration: dur,
    maxAttempts: maxAttempts,
    showCorrectToStudent: document.getElementById("show-correct-toggle")
      ? document.getElementById("show-correct-toggle").checked
      : false,
    warnMode: document.getElementById("exam-warn-mode")
      ? document.getElementById("exam-warn-mode").value
      : "warn-first",
    successMessage: teacherGlobalSettings.successMessage || "",
    failMessage: teacherGlobalSettings.failMessage || "",
    teacherId: teacherId,
    teacher: teacher,
    createdAt: Date.now(),
    questionCount: questions.length,
    questions: questions.map(function (q) {
      return {
        text: q.text,
        type: q.type || "mcq",
        points: q.points || 1,
        image: q.image || "",
        options: q.options.slice(),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
      };
    }),
  };
  var btn = document.getElementById("btn-upload-exam");
  btn.disabled = true;
  btn.innerHTML =
    '<div class="spin" style="width:18px;height:18px;border-width:2px;margin:0;flex-shrink:0;"></div> بيحفظ...';
  try {
    if (editingId) {
      var origSnap = await get(ref(db, "exams/" + editingId + "/createdAt"));
      data.createdAt = origSnap.val() || Date.now();
      await set(ref(db, "exams/" + editingId), data);
      toast("التعديلات اتحفظت ✔", "ok");
      cancelEdit();
    } else {
      var id = genId();
      await set(ref(db, "exams/" + id), data);
      var base = window.location.href.split("?")[0].split("#")[0];
      base = base.substring(0, base.lastIndexOf("/") + 1);
      var link = base + "exam.html?id=" + id;
      var linkInput = document.getElementById("exam-link-input");
      if (linkInput) linkInput.value = link;
      var idShow = document.getElementById("exam-id-show");
      if (idShow) idShow.textContent = id;
      openModal("modal-upload");
      document.getElementById("exam-title").value = "";
      document.getElementById("exam-duration").value = "";
      document.getElementById("exam-max-attempts").value = "1";
      questions = [];
      addQuestion();
      toast("اترفع بنجاح ✔", "ok");
      if (typeof confetti === "function")
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
    btn.disabled = false;
    btn.innerHTML = editingId
      ? '<i class="fa-solid fa-floppy-disk"></i> احفظ التعديلات'
      : '<i class="fa-solid fa-cloud-arrow-up"></i> ارفع الامتحان';
  } catch (err) {
    console.error("Exam Upload Error:", err);
    toast("في مشكلة في الحفظ، اتأكد من النت", "bad");
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> ارفع الامتحان';
  }
}
function syncDOM() {
  document.querySelectorAll(".q-input").forEach(function (el) {
    questions[+el.dataset.q].text = el.value;
  });
  document.querySelectorAll(".opt-exp").forEach(function (el) {
    questions[+el.dataset.q].explanation = el.value;
  });
  document.querySelectorAll(".opt-text").forEach(function (el) {
    var q = +el.dataset.q,
      o = +el.dataset.o;
    if (questions[q] && questions[q].options[o] !== undefined)
      questions[q].options[o] = el.value;
  });
}
function genId() {
  var ch = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var r = "";
  for (var i = 0; i < 6; i++) r += ch[Math.floor(Math.random() * ch.length)];
  return r;
}
function copyLink() {
  var inp = document.getElementById("exam-link-input");
  var btn = document.getElementById("btn-copy-link");
  var text = inp.value;
  navigator.clipboard
    .writeText(text)
    .then(function () {
      markCopied(btn);
    })
    .catch(function () {
      inp.select();
      document.execCommand("copy");
      markCopied(btn);
    });
}
function markCopied(btn) {
  btn.textContent = "✔ اتنسخ";
  btn.classList.add("done");
  setTimeout(function () {
    btn.textContent = "انسخ";
    btn.classList.remove("done");
  }, 2200);
}
function copyExamLink(examId) {
  var base =
    window.location.origin +
    window.location.pathname.substring(
      0,
      window.location.pathname.lastIndexOf("/") + 1,
    );
  var link = base + "exam.html?id=" + examId;
  navigator.clipboard
    .writeText(link)
    .then(function () {
      toast("الرابط اتنسخ ✔", "ok");
    })
    .catch(function () {
      toast("الرابط اتنسخ ✔", "ok");
    });
}
function openShareModal(examId, examTitle) {
  var base =
    window.location.origin +
    window.location.pathname.substring(
      0,
      window.location.pathname.lastIndexOf("/") + 1,
    );
  var link = base + "exam.html?id=" + examId;
  document.getElementById("share-link-input").value = link;
  document.getElementById("share-code-input").value = examId;
  var shareText = encodeURIComponent(
    "ادخل امتحاني الآن: " +
      examTitle +
      "\nالرابط: " +
      link +
      "\nكود الدخول: " +
      examId,
  );
  var linkEnc = encodeURIComponent(link);
  document.getElementById("btn-share-whatsapp").onclick = function () {
    window.open(
      "https://api.whatsapp.com/send?text=" + shareText,
    );
  };
  document.getElementById("btn-share-telegram").onclick = function () {
    window.open(
      "https://t.me/share/url?url=" +
        linkEnc +
        "&text=" +
        shareText,
    );
  };
  document.getElementById("btn-share-facebook").onclick = function () {
    window.open(
      "https://www.facebook.com/sharer/sharer.php?u=" +
        linkEnc,
    );
  };
  openModal("modal-share");
}
document.getElementById("modal-share-x").addEventListener("click", function () {
  closeModal("modal-share");
});
document
  .getElementById("btn-copy-share-link")
  .addEventListener("click", function () {
    var btn = this;
    navigator.clipboard
      .writeText(document.getElementById("share-link-input").value)
      .then(function () {
        markCopied(btn);
        toast("تم نسخ الرابط بنجاح", "ok");
      });
  });
document
  .getElementById("btn-copy-share-code")
  .addEventListener("click", function () {
    var btn = this;
    navigator.clipboard
      .writeText(document.getElementById("share-code-input").value)
      .then(function () {
        markCopied(btn);
        toast("الكود اتنسخ بنجاح", "ok");
      });
  });
function loadExams() {
  var examsQuery = query(
    ref(db, "exams"),
    orderByChild("teacherId"),
    equalTo(teacherId),
  );
  onValue(examsQuery, function (snap) {
    var container = document.getElementById("exams-list");
    var empty = document.getElementById("exams-empty");
    container.innerHTML = "";
    var allExams = snap.exists() ? snap.val() : {};
    var myExams = {};
    Object.keys(allExams).forEach(function (id) {
      if (allExams[id].teacherId === teacherId) myExams[id] = allExams[id];
    });
    if (Object.keys(myExams).length === 0) {
      container.appendChild(empty);
      empty.style.display = "";
      return;
    }
    empty.style.display = "none";
    Object.keys(myExams)
      .reverse()
      .forEach(function (id, idx) {
        var e = myExams[id];
        var ds = new Date(e.createdAt).toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        var maxTxt =
          e.maxAttempts === 0 ? "براحته (مفيش حد)" : e.maxAttempts + " محاولة";
        var card = document.createElement("div");
        card.className = "exam-card";
        card.style.animationDelay = idx * 0.05 + "s";
        card.innerHTML =
          '<div class="exam-card-icon">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>' +
          "</div>" +
          '<div class="exam-card-info">' +
          '<div class="exam-card-title">' +
          esc(e.title) +
          "</div>" +
          '<div class="exam-card-meta">' +
          '<span><i class="fa-regular fa-calendar"></i> ' +
          ds +
          "</span>" +
          '<span><i class="fa-solid fa-list-ol"></i> ' +
          (e.questionCount || 0) +
          " \u0633\u0624\u0627\u0644</span>" +
          '<span><i class="fa-regular fa-clock"></i> ' +
          e.duration +
          " \u062f\u0642\u064a\u0642\u0629</span>" +
          '<span><i class="fa-solid fa-rotate"></i> ' +
          maxTxt +
          "</span>" +
          "</div></div>" +
          '<div class="exam-card-actions">' +
          '<button class="icon-btn share" title="شير الامتحان" data-id="' +
          id +
          '"><i class="fa-solid fa-share-nodes"></i></button>' +
          '<button class="icon-btn edit" title="تعديل" data-id="' +
          id +
          '"><i class="fa-solid fa-pen-to-square"></i></button>' +
          '<button class="icon-btn del" title="امسح" data-id="' +
          id +
          '"><i class="fa-solid fa-eraser"></i></button>' +
          '<button class="icon-btn chart" title="النتائج" data-id="' +
          id +
          '"><i class="fa-solid fa-chart-column"></i></button>' +
          "</div>";
        container.appendChild(card);
      });
    container.appendChild(empty);
    container.querySelectorAll(".icon-btn.share").forEach(function (b) {
      b.addEventListener("click", function () {
        openShareModal(b.dataset.id, myExams[b.dataset.id].title);
      });
    });
    container.querySelectorAll(".icon-btn.edit").forEach(function (b) {
      b.addEventListener("click", function () {
        startEdit(b.dataset.id);
      });
    });
    container.querySelectorAll(".icon-btn.del").forEach(function (b) {
      b.addEventListener("click", function () {
        deleteTargetId = b.dataset.id;
        openModal("modal-del");
      });
    });
    container.querySelectorAll(".icon-btn.chart").forEach(function (b) {
      b.addEventListener("click", function () {
        showResults(b.dataset.id);
      });
    });
  });
}
async function doDel() {
  if (!deleteTargetId) return;
  try {
    await remove(ref(db, "exams/" + deleteTargetId));
    await remove(ref(db, "attempts/" + deleteTargetId));
    closeModal("modal-del");
    toast("الامتحان اتمسح ✔", "ok");
    deleteTargetId = null;
  } catch (err) {
    toast("في مشكلة في المسح", "bad");
  }
}
async function showResults(examId) {
  currentExamId = examId;
  goTo("results");
  try {
    var eSnap = await get(ref(db, "exams/" + examId));
    var aSnap = await get(ref(db, "attempts/" + examId));
    if (!eSnap.exists()) {
      toast("امتحان مش موجود", "bad");
      return;
    }
    var exam = eSnap.val();
    currentExamData = exam;
    document.getElementById("results-title").textContent = exam.title;
    document.getElementById("results-desc").textContent =
      exam.questionCount + " سؤال — " + exam.duration + " دقيقة";
    if (!aSnap.exists()) {
      setStats(0, 0, 0, 0);
      document.getElementById("stu-tbody").innerHTML =
        '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text3)">مفيش حد دخل لسه</td></tr>';
      document.getElementById("leaderboard-wrap").style.display = "none";
      return;
    }
    var rawAttempts = aSnap.val();
    var accountMap = {};
    Object.keys(rawAttempts).forEach(function (aid) {
      var a = rawAttempts[aid];
      var key =
        a.uid || a.email || a.fingerprint || a.studentName + "|" + a.fatherName;
      if (!accountMap[key]) {
        accountMap[key] = {
          uid: a.uid || "",
          email: a.email || a.fatherName || "",
          role: a.role || "student",
          names: [],
          attempts: [],
        };
      }
      if (
        a.studentName &&
        accountMap[key].names.indexOf(a.studentName) === -1
      ) {
        accountMap[key].names.push(a.studentName);
      }
      var sc = a.score || 0;
      var tot = a.totalQuestions || exam.questionCount || 1;
      var pct = Math.round((sc / tot) * 100);
      var elapsed =
        a.endTime && a.startTime
          ? Math.floor((a.endTime - a.startTime) / 1000)
          : Infinity;
      accountMap[key].attempts.push({
        aid: aid,
        a: a,
        sc: sc,
        tot: tot,
        pct: pct,
        elapsed: elapsed,
      });
    });
    var students = Object.values(accountMap).map(function (acc) {
      acc.attempts.sort(function (x, y) {
        return x.a.startTime - y.a.startTime;
      });
      var best = acc.attempts.reduce(function (b, r) {
        return r.pct > b.pct ? r : b;
      }, acc.attempts[0]);
      return { acc: acc, best: best };
    });
    students.sort(function (a, b) {
      if (b.best.pct !== a.best.pct) return b.best.pct - a.best.pct;
      return a.best.elapsed - b.best.elapsed;
    });
    var totalPct = 0,
      passed = 0,
      cheated = 0;
    students.forEach(function (s) {
      totalPct += s.best.pct;
      if (s.best.pct >= 50) passed++;
      if (
        s.acc.attempts.some(function (r) {
          return r.a.status === "cheated";
        })
      )
        cheated++;
    });
    setStats(
      students.length,
      students.length ? Math.round(totalPct / students.length) : 0,
      passed,
      cheated,
    );
    var forLeaderboard = students.map(function (s) {
      return Object.assign({}, s.best, {
        a: Object.assign({}, s.best.a, {
          studentName: s.acc.names[s.acc.names.length - 1] || "—",
        }),
      });
    });
    buildLeaderboard(forLeaderboard.slice(0, 10), exam);
    renderChart(
      students.map(function (s) {
        return s.best;
      }),
    );
    var tbody = document.getElementById("stu-tbody");
    tbody.innerHTML = "";
    students.forEach(function (s, idx) {
      var acc = s.acc;
      var best = s.best;
      var displayName = acc.names.join(" / ") || "—";
      var isSelf = acc.uid && acc.uid === teacherId;
      var isTeacher = acc.role === "teacher";
      var attCount = acc.attempts.length;
      var nameCell = esc(displayName);
      if (isSelf)
        nameCell +=
          '<span style="background:var(--accent);color:#fff;padding:2px 8px;border-radius:4px;font-size:0.6rem;margin-right:6px;font-weight:900;">ده إنت</span>';
      else if (isTeacher)
        nameCell +=
          '<span style="background:var(--accent-soft);color:var(--accent);padding:2px 7px;border-radius:4px;font-size:0.6rem;margin-right:6px;font-weight:800;">معلم</span>';
      var emailLine = acc.email
        ? '<div style="font-size:0.72rem;color:var(--text3);margin-top:2px;font-family:var(--font-en);direction:ltr;text-align:right;">' +
          esc(acc.email) +
          "</div>"
        : "";
      var attBadge =
        attCount > 1
          ? '<div style="font-size:0.7rem;color:var(--accent);font-weight:800;margin-top:3px;"><i class="fa-solid fa-rotate"></i> ' +
            attCount +
            " محاولات</div>"
          : "";
      var stCls =
        best.a.status === "cheated"
          ? "cheat"
          : best.a.status === "submitted"
            ? "ok"
            : "prog";
      var stTxt =
        best.a.status === "cheated"
          ? "غش"
          : best.a.status === "submitted"
            ? "تم"
            : "جارٍ";
      var tStr = best.elapsed < Infinity ? fmtSecs(best.elapsed) : "—";
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td style="font-family:var(--font-en);font-weight:800;color:var(--text3);font-size:0.78rem;">' +
        (idx + 1) +
        "</td>" +
        '<td><div class="stu-cell"><div class="stu-av" style="background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:var(--radius-xs);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:0.75rem;">' +
        esc(
          acc.names[acc.names.length - 1]
            ? acc.names[acc.names.length - 1].charAt(0)
            : "?",
        ) +
        "</div>" +
        '<div><div class="stu-name" style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">' +
        nameCell +
        "</div>" +
        emailLine +
        attBadge +
        "</div></div></td>" +
        '<td style="font-family:var(--font-en);font-weight:800;color:' +
        (best.pct >= 50 ? "var(--green)" : "var(--red)") +
        '">' +
        best.pct +
        '% <span style="font-weight:400;color:var(--text3);font-size:0.7rem">(' +
        best.sc +
        "/" +
        best.tot +
        ")</span></td>" +
        '<td style="font-family:var(--font-en);font-size:0.8rem;color:var(--text2);">' +
        tStr +
        "</td>" +
        '<td><span class="badge ' +
        stCls +
        '">' +
        stTxt +
        "</span></td>" +
        '<td><button class="btn btn-sm btn-soft view-rpt" data-a="' +
        best.aid +
        '" data-e="' +
        examId +
        '"><i class="fa-solid fa-eye"></i></button></td>';
      if (attCount > 1) {
        tr.querySelector(".view-rpt").innerHTML =
          '<i class="fa-solid fa-layer-group"></i>';
        tr.querySelector(".view-rpt").title = "شوف كل المحاولات";
        tr.querySelector(".view-rpt").dataset.multi = "1";
        tr.querySelector(".view-rpt").dataset.uid = acc.uid || "";
        tr.querySelector(".view-rpt").dataset.name = displayName;
        tr.querySelector(".view-rpt").dataset.attJson = JSON.stringify(
          acc.attempts.map(function (r, i) {
            return {
              aid: r.aid,
              examId: examId,
              num: i + 1,
              pct: r.pct,
              sc: r.sc,
              tot: r.tot,
              elapsed: r.elapsed,
              status: r.a.status,
              startTime: r.a.startTime,
            };
          }),
        );
      }
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll(".view-rpt").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.dataset.multi === "1") {
          showStudentAttempts(b.dataset.name, JSON.parse(b.dataset.attJson));
        } else {
          showReport(b.dataset.e, b.dataset.a);
        }
      });
    });
  } catch (err) {
    toast("مشكلة في التحميل", "bad");
  }
}
function showStudentAttempts(name, attempts) {
  document.getElementById("modal-attempts-title").textContent =
    "محاولات: " + name;
  var list = document.getElementById("modal-attempts-list");
  list.innerHTML = "";
  attempts.forEach(function (att) {
    var stCls =
      att.status === "cheated"
        ? "cheat"
        : att.status === "submitted"
          ? "ok"
          : "prog";
    var stTxt =
      att.status === "cheated"
        ? "غش"
        : att.status === "submitted"
          ? "تم"
          : "جارٍ";
    var tStr = att.elapsed < Infinity ? fmtSecs(att.elapsed) : "—";
    var dStr = att.startTime
      ? new Date(att.startTime).toLocaleString("ar-EG", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
        })
      : "—";
    var el = document.createElement("div");
    el.className = "q-card";
    el.style.cssText =
      "padding:15px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:transform 0.2s; border:1px solid var(--border); margin-bottom:5px;";
    el.onmouseover = function () {
      this.style.transform = "translateY(-2px)";
      this.style.borderColor = "var(--accent)";
    };
    el.onmouseout = function () {
      this.style.transform = "none";
      this.style.borderColor = "var(--border)";
    };
    el.innerHTML =
      "<div>" +
      '<div style="font-weight:800; font-size:1rem; color:var(--text); margin-bottom:4px;">المحاولة ' +
      att.num +
      "</div>" +
      '<div style="font-size:0.8rem; color:var(--text2);"><i class="fa-regular fa-clock"></i> ' +
      dStr +
      "</div>" +
      "</div>" +
      '<div style="text-align:left;">' +
      '<div style="font-weight:900; color:' +
      (att.pct >= 50 ? "var(--green)" : "var(--red)") +
      ';">' +
      att.pct +
      '% <span style="font-size:0.7rem;font-weight:400;color:var(--text3);">(' +
      att.sc +
      "/" +
      att.tot +
      ")</span></div>" +
      '<div style="margin-top:4px;"><span class="badge ' +
      stCls +
      '">' +
      stTxt +
      "</span></div>" +
      "</div>";
    el.addEventListener("click", function () {
      closeModal("modal-student-attempts");
      showReport(att.examId, att.aid);
    });
    list.appendChild(el);
  });
  openModal("modal-student-attempts");
}
function buildLeaderboard(top, exam) {
  var wrap = document.getElementById("leaderboard-wrap");
  var lb = document.getElementById("leaderboard");
  lb.innerHTML = "";
  if (!top || top.length === 0) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "";
  var rankClasses = ["gold", "silver", "bronze"];
  var medals = ["\ud83e\udd47", "\ud83e\udd48", "\ud83e\udd49"];
  top.forEach(function (r, idx) {
    var a = r.a;
    var fullName = (a.studentName || "\u2014") + " " + (a.fatherName || "");
    var rCls = idx < 3 ? rankClasses[idx] : "default";
    var tStr = r.elapsed < Infinity ? fmtSecs(r.elapsed) : "\u2014";
    var item = document.createElement("div");
    item.className = "lb-item";
    item.style.animationDelay = idx * 0.06 + "s";
    item.innerHTML =
      '<div class="lb-rank ' +
      rCls +
      '">' +
      (idx < 3 ? medals[idx] : idx + 1) +
      "</div>" +
      '<div class="lb-av" style="background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:var(--radius-xs);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:0.78rem;">' +
      esc(a.studentName ? a.studentName.charAt(0) : "?") +
      "</div>" +
      '<div class="lb-name">' +
      esc(fullName) +
      "</div>" +
      '<div class="lb-meta">' +
      '<span class="lb-score">' +
      r.pct +
      "%</span>" +
      '<span class="lb-time"><i class="fa-solid fa-clock"></i>' +
      tStr +
      "</span>" +
      "</div>";
    lb.appendChild(item);
  });
}
function setStats(total, avg, pass, cheat) {
  document.getElementById("s-total").textContent = total;
  document.getElementById("s-avg").textContent = avg + "%";
  document.getElementById("s-pass").textContent = pass;
  document.getElementById("s-cheat").textContent = cheat;
}
function fmtSecs(s) {
  var m = Math.floor(s / 60);
  var sec = s % 60;
  return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}
async function showReport(examId, attemptId) {
  goTo("report");
  document.getElementById("ai-output").innerHTML = "";
  try {
    var eSnap = await get(ref(db, "exams/" + examId));
    var aSnap = await get(ref(db, "attempts/" + examId + "/" + attemptId));
    if (!eSnap.exists() || !aSnap.exists()) {
      toast(
        "\u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0634 \u0645\u0648\u062c\u0648\u062f\u0629",
        "bad",
      );
      return;
    }
    var exam = eSnap.val();
    var a = aSnap.val();
    currentReportLogs = a.logs || null;
    currentReportStudentName =
      (a.studentName || "") + " " + (a.fatherName || "");
    var fullName = (a.studentName || "\u2014") + " " + (a.fatherName || "");
    var st = a.startTime
      ? new Date(a.startTime).toLocaleTimeString("ar-EG")
      : "\u2014";
    var et = a.endTime
      ? new Date(a.endTime).toLocaleTimeString("ar-EG")
      : "\u2014";
    var elapsed =
      a.endTime && a.startTime
        ? fmtSecs(Math.floor((a.endTime - a.startTime) / 1000))
        : "\u2014";
    var stCls = a.status === "cheated" ? "cheat" : "ok";
    var stTxt =
      a.status === "cheated"
        ? "\u0645\u062d\u0627\u0648\u0644\u0629 \u063a\u0634"
        : "\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645";
    var pct = Math.round(((a.score || 0) / exam.questionCount) * 100);
    document.getElementById("rpt-header").innerHTML =
      '<div class="rpt-header-card">' +
      '<div class="rpt-av" style="background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:1.2rem;">' +
      esc(a.studentName ? a.studentName.charAt(0) : "?") +
      "</div>" +
      '<div style="flex:1;min-width:0;">' +
      '<div class="rpt-name">' +
      esc(fullName) +
      "</div>" +
      '<div class="rpt-meta">' +
      '<span><i class="fa-solid fa-globe"></i><span class="font-en">' +
      (a.ip || "\u2014") +
      "</span></span>" +
      '<span><i class="fa-solid fa-fingerprint"></i><span class="font-en">' +
      (a.fingerprint || "\u2014").substring(0, 12) +
      "</span></span>" +
      '<span><span class="badge ' +
      stCls +
      '">' +
      stTxt +
      "</span></span>" +
      "</div>" +
      '<div class="rpt-meta" style="margin-top:4px;">' +
      '<span><i class="fa-regular fa-clock"></i>\u0628\u062f\u0627\u064a\u0629: ' +
      st +
      "</span>" +
      '<span><i class="fa-solid fa-flag-checkered"></i>\u0646\u0647\u0627\u064a\u0629: ' +
      et +
      "</span>" +
      '<span><i class="fa-solid fa-stopwatch"></i>\u0645\u062f\u0629: ' +
      elapsed +
      "</span>" +
      '<span><i class="fa-solid fa-star"></i>\u0627\u0644\u062f\u0631\u062c\u0629: <strong style="color:' +
      (pct >= 50 ? "var(--green)" : "var(--red)") +
      '">' +
      (a.score || 0) +
      "/" +
      exam.questionCount +
      " (" +
      pct +
      "%)</strong></span>" +
      '<span><i class="fa-solid fa-triangle-exclamation"></i>\u0625\u0646\u0630\u0627\u0631\u0627\u062a: <strong>' +
      (a.strikes || 0) +
      "</strong></span>" +
      "</div></div></div>";
    var pSection = document.getElementById("proctor-section");
    if (a.proctoring) {
      var pEntries = Object.values(a.proctoring).sort(function (x, y) {
        return x.timestamp - y.timestamp;
      });
      var pTotal = pEntries.length;
      var pFlagged = pEntries.filter(function (p) {
        return p.flagged;
      }).length;
      var pClean = pTotal - pFlagged;
      var pPct = pTotal ? Math.round((pFlagged / pTotal) * 100) : 0;
      document.getElementById("p-total").textContent = pTotal;
      document.getElementById("p-flagged").textContent = pFlagged;
      document.getElementById("p-clean").textContent = pClean;
      document.getElementById("p-pct").textContent = pPct + "%";
      var pEvList = document.getElementById("proctor-events");
      pEvList.innerHTML = "";
      pEntries.forEach(function (p) {
        var t = new Date(p.timestamp).toLocaleTimeString("ar-EG", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        var line = document.createElement("div");
        line.className = "proctor-event" + (p.flagged ? " flag" : "");
        line.innerHTML =
          '<i class="fa-solid ' +
          (p.flagged ? "fa-circle-exclamation" : "fa-circle-check") +
          '"></i>' +
          "<span>" +
          esc(p.analysis || "") +
          "</span>" +
          '<span class="pe-time">' +
          t +
          "</span>";
        pEvList.appendChild(line);
      });
      pSection.style.display = "";
    } else {
      pSection.style.display = "none";
    }
    var totalExamPoints = 0;
    var gradedScore = 0;
    var pendingEssay = false;

    exam.questions.forEach(function(q) {
      totalExamPoints += (q.points || 1);
    });

    var ans = a.answers || {};
    var qCont = document.getElementById("rpt-questions");
    qCont.innerHTML = "";

    window.currentReportExam = exam;
    window.currentReportAttempt = a;
    window.currentReportExamId = examId;
    window.currentReportAttemptId = attemptId;

    exam.questions.forEach(function (q, qi) {
      q.type = q.type || "mcq";
      q.points = q.points || 1;
      var qScore = 0;

      if (q.type === "mcq") {
        var sa = ans[qi] !== undefined ? parseInt(ans[qi]) : -1;
        var ok = sa === q.correctAnswer;
        if (ok) qScore = q.points;
        
        var optsH = q.options.map(function (opt, oi) {
            var cls = "", ic = '<i class="fa-regular fa-circle" style="opacity:0.25;"></i>', tag = "";
            if (oi === q.correctAnswer && oi === sa) {
              cls = "is-correct";
              ic = '<i class="fa-solid fa-check"></i>';
              tag = '<span class="rpt-tag ctag">✓ صح + اختيار الطالب</span>';
            } else if (oi === q.correctAnswer) {
              cls = "is-correct";
              ic = '<i class="fa-solid fa-check"></i>';
              tag = '<span class="rpt-tag ctag">✓ الإجابة الصحيحة</span>';
            } else if (oi === sa) {
              cls = "is-wrong";
              ic = '<i class="fa-solid fa-xmark"></i>';
              tag = '<span class="rpt-tag wtag">✗ اختار الطالب</span>';
            }
            return '<div class="rpt-opt ' + cls + '">' + ic + " " + esc(opt) + tag + "</div>";
          }).join("");
          
        var card = document.createElement("div");
        card.className = "rpt-q " + (ok ? "correct" : "wrong");
        card.innerHTML =
          '<div class="rpt-q-head">' +
          '<span style="font-weight:800;font-size:0.85rem;">السؤال ' + (qi + 1) + ' (اختياري - ' + q.points + ' درجات)</span>' +
          '<span class="rpt-q-status ' + (ok ? "correct" : "wrong") + '"><i class="fa-solid ' + (ok ? "fa-check" : "fa-xmark") + '"></i> ' + (ok ? "صح" : "غلط") + " (" + qScore + "/" + q.points + ")</span>" +
          "</div>" +
          (q.image ? '<img src="' + q.image + '" style="max-height:200px; border-radius:8px; display:block; margin:10px 0;">' : '') +
          '<div class="rpt-q-text">' + esc(q.text) + "</div>" +
          '<div class="rpt-opts">' + optsH + "</div>";
        qCont.appendChild(card);
        gradedScore += qScore;
        
      } else if (q.type === "essay") {
        var studentText = ans[qi] || "";
        // essayPoints can be saved in a.essayGrades[qi]
        var eGrades = a.essayGrades || {};
        var isGraded = eGrades[qi] !== undefined;
        var eScore = isGraded ? eGrades[qi] : 0;
        if (isGraded) {
          gradedScore += eScore;
        } else {
          pendingEssay = true;
        }
        
        var card = document.createElement("div");
        card.className = "rpt-q";
        card.style.borderColor = isGraded ? "var(--accent)" : "var(--orange)";
        
        var headH = '<div class="rpt-q-head">' +
          '<span style="font-weight:800;font-size:0.85rem;">السؤال ' + (qi + 1) + ' (مقالي - من ' + q.points + ' درجات)</span>' +
          '<span class="rpt-q-status" style="color:' + (isGraded ? 'var(--accent)' : 'var(--orange)') + '"><i class="fa-solid ' + (isGraded ? "fa-check-double" : "fa-clock") + '"></i> ' + (isGraded ? "تم التصحيح (" + eScore + "/" + q.points + ")" : "في انتظار التصحيح") + '</span>' +
          '</div>';
          
        var bodyH = (q.image ? '<img src="' + q.image + '" style="max-height:200px; border-radius:8px; display:block; margin:10px 0;">' : '') +
                    '<div class="rpt-q-text">' + esc(q.text) + '</div>' +
                    '<div style="background:var(--bg2); padding:15px; border-radius:8px; margin-top:10px; border:1px solid var(--border); white-space:pre-wrap; color:var(--text);">' + esc(studentText || 'لم يكتب الطالب شيئاً') + '</div>';
                    
        var gradeH = '<div style="margin-top:15px; display:flex; gap:10px; align-items:center; background:rgba(255,255,255,0.03); padding:10px; border-radius:8px;">' +
                     '<label>الدرجة المستحقة:</label>' +
                     '<input type="number" class="field essay-grade-input" data-qi="' + qi + '" data-max="' + q.points + '" value="' + (isGraded ? eScore : '') + '" min="0" max="' + q.points + '" style="width:80px; padding:6px;">' +
                     '<span style="color:var(--text3);">من ' + q.points + '</span>' +
                     '<button class="btn btn-sm btn-accent btn-save-essay" data-qi="' + qi + '">احفظ الدرجة</button>' +
                     '</div>';
                     
        card.innerHTML = headH + bodyH + gradeH;
        qCont.appendChild(card);
      }
    });
    
    var pct = Math.round((gradedScore / totalExamPoints) * 100);
    // Update header score text dynamically based on our gradedScore
    // We already output a header earlier in the function, so let's update it in the DOM!
    var scoreElem = document.getElementById("rpt-header").querySelector("strong");
    if(scoreElem) {
        scoreElem.innerHTML = gradedScore + "/" + totalExamPoints + " (" + pct + "%)" + (pendingEssay ? " <span style='font-size:0.75rem; color:var(--orange);'>(المقالي لسه بيتعلم)</span>" : "");
    }

    // Attach event listeners for saving essay grades
    document.querySelectorAll('.btn-save-essay').forEach(btn => {
      btn.onclick = async function() {
        var qi = this.dataset.qi;
        var input = document.querySelector('.essay-grade-input[data-qi="' + qi + '"]');
        var val = parseFloat(input.value);
        var max = parseFloat(input.dataset.max);
        if (isNaN(val) || val < 0 || val > max) {
          toast("الدرجة غير صحيحة", "bad");
          return;
        }
        
        var eg = window.currentReportAttempt.essayGrades || {};
        eg[qi] = val;
        
        // Recalculate total score
        var newScore = 0;
        window.currentReportExam.questions.forEach((q, i) => {
          q.type = q.type || "mcq";
          q.points = q.points || 1;
          if (q.type === "mcq") {
            var sa = window.currentReportAttempt.answers[i] !== undefined ? parseInt(window.currentReportAttempt.answers[i]) : -1;
            if (sa === q.correctAnswer) newScore += q.points;
          } else if (q.type === "essay") {
            if (eg[i] !== undefined) newScore += eg[i];
          }
        });
        
        try {
          var attemptRef = ref(db, "attempts/" + window.currentReportExamId + "/" + window.currentReportAttemptId);
          await update(attemptRef, {
            essayGrades: eg,
            score: newScore
          });
          toast("تم حفظ درجة المقالي وتحديث المجموع!", "ok");
          window.currentReportAttempt.essayGrades = eg;
          window.currentReportAttempt.score = newScore;
          // Refresh report
          showReport(window.currentReportExamId, window.currentReportAttemptId);
        } catch(e) {
          toast("خطأ في الحفظ", "bad");
        }
      };
    });

    var logList = document.getElementById("rpt-log-list");
    logList.innerHTML = "";
    if (a.logs) {
      Object.values(a.logs)
        .sort(function (x, y) {
          return x.timestamp - y.timestamp;
        })
        .forEach(function (log) {
          var time = new Date(log.timestamp).toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          var ic = "fa-circle-info",
            cls = "",
            lbl = log.type;
          var map = {
            "tab-switch": [
              "fa-eye-slash",
              "warn",
              "\u062e\u0631\u0648\u062c \u0645\u0646 \u0627\u0644\u0635\u0641\u062d\u0629",
            ],
            "tab-return": [
              "fa-eye",
              "",
              "\u0631\u062c\u0648\u0639 \u0644\u0644\u0635\u0641\u062d\u0629",
            ],
            blur: [
              "fa-window-minimize",
              "warn",
              "\u0641\u0642\u062f \u062a\u0631\u0643\u064a\u0632 \u0627\u0644\u0646\u0627\u0641\u0630\u0629",
            ],
            "fullscreen-exit": [
              "fa-compress",
              "warn",
              "\u062e\u0631\u0648\u062c \u0645\u0646 \u0645\u0644\u0621 \u0627\u0644\u0634\u0627\u0634\u0629",
            ],
            strike: [
              "fa-triangle-exclamation",
              "err",
              "\u0625\u0646\u0630\u0627\u0631 #" + (log.details || ""),
            ],
            "auto-submit": [
              "fa-ban",
              "err",
              "\u062a\u0633\u0644\u064a\u0645 \u062a\u0644\u0642\u0627\u0626\u064a (\u063a\u0634)",
            ],
            "exam-start": [
              "fa-play",
              "",
              "\u0628\u062f\u0627\u064a\u0629 \u0627\u0644\u0627\u0645\u062a\u062d\u0627\u0646",
            ],
            "exam-submit": [
              "fa-flag-checkered",
              "",
              "\u062a\u0633\u0644\u064a\u0645 \u0627\u0644\u0627\u0645\u062a\u062d\u0627\u0646",
            ],
          };
          if (map[log.type]) {
            ic = map[log.type][0];
            cls = map[log.type][1];
            lbl = map[log.type][2];
          }
          var el = document.createElement("div");
          el.className = "log-item " + cls;
          el.innerHTML =
            '<i class="fa-solid ' +
            ic +
            '"></i><span>' +
            lbl +
            '</span><span class="log-t">' +
            time +
            "</span>";
          logList.appendChild(el);
        });
    } else {
      logList.innerHTML =
        '<div class="log-item"><i class="fa-solid fa-circle-info"></i> \u0645\u0641\u064a\u0634 \u0633\u062c\u0644 \u0646\u0634\u0627\u0637</div>';
    }
  } catch (err) {
    toast(
      "\u0645\u0634\u0643\u0644\u0629 \u0641\u064a \u0627\u0644\u062a\u0642\u0631\u064a\u0631",
      "bad",
    );
  }
}
async function runAIAnalysis() {
  if (!currentReportLogs) {
    toast(
      "\u0645\u0641\u064a\u0634 \u0628\u064a\u0627\u0646\u0627\u062a \u0646\u0634\u0627\u0637 \u0644\u062a\u062d\u0644\u064a\u0644\u0647\u0627",
      "bad",
    );
    return;
  }
  var output = document.getElementById("ai-output");
  output.innerHTML =
    '<div class="ai-loading"><div class="spin" style="width:20px;height:20px;border-width:2px;margin:0;flex-shrink:0;"></div> \u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0644\u064a\u0644...</div>';
  var logEntries = Object.values(currentReportLogs).sort(function (a, b) {
    return a.timestamp - b.timestamp;
  });
  var logText = logEntries
    .map(function (l) {
      return (
        new Date(l.timestamp).toLocaleTimeString("ar-EG") +
        " \u2014 " +
        l.type +
        (l.details ? " (" + l.details + ")" : "")
      );
    })
    .join("\n");
  var prompt =
    '\u0623\u0646\u062a \u0645\u062d\u0644\u0644 \u0633\u0644\u0648\u0643 \u0637\u0644\u0627\u0628 \u0641\u064a \u0646\u0638\u0627\u0645 \u0627\u0645\u062a\u062d\u0627\u0646\u0627\u062a \u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a. \u062d\u0644\u0644 \u0633\u062c\u0644 \u0627\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u062a\u0627\u0644\u064a \u0644\u0644\u0637\u0627\u0644\u0628 "' +
    currentReportStudentName +
    '" \u0648\u0642\u062f\u0645 \u062a\u0642\u0631\u064a\u0631\u0643 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0627\u0644\u0645\u0635\u0631\u064a\u0629 \u0627\u0644\u0628\u0633\u064a\u0637\u0629.\n\n' +
    "\u0633\u062c\u0644 \u0627\u0644\u0646\u0634\u0627\u0637:\n" +
    logText +
    "\n\n" +
    "\u0627\u0644\u0645\u0637\u0644\u0648\u0628:\n" +
    "1. \u0645\u0644\u062e\u0635 \u0633\u0644\u0648\u0643 \u0627\u0644\u0637\u0627\u0644\u0628\n" +
    "2. \u0647\u0644 \u064a\u0648\u062c\u062f \u0627\u0634\u062a\u0628\u0627\u0647 \u0641\u064a \u0627\u0644\u063a\u0634\u061f \u0648\u0644\u064a\u0647\u061f\n" +
    "3. \u062a\u062d\u0644\u064a\u0644 \u0623\u0648\u0642\u0627\u062a \u0627\u0644\u062e\u0631\u0648\u062c \u0648\u0627\u0644\u062f\u062e\u0648\u0644 \u0625\u0646 \u0648\u062c\u062f\u062a\n" +
    "4. \u062a\u0648\u0635\u064a\u062a\u0643 \u0644\u0644\u0645\u0639\u0644\u0645 \u0628\u0634\u0643\u0644 \u0645\u062e\u062a\u0635\u0631 \u0648\u0648\u0627\u0636\u062d\n\n" +
    "\u0627\u0643\u062a\u0628 \u0628\u0623\u0633\u0644\u0648\u0628 \u0648\u0627\u0636\u062d \u0648\u0645\u0628\u0627\u0634\u0631 \u0628\u062f\u0648\u0646 \u062a\u0646\u0633\u064a\u0642 markdown.";
  try {
    var res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyAjE-2q6PONBkCin9ZN22gDp9Q8pAH9ZW8",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    var data = await res.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      var text = data.candidates[0].content.parts[0].text;
      output.innerHTML =
        '<div class="ai-result">' +
        text
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\n/g, "<br>") +
        "</div>";
    } else {
      output.innerHTML =
        '<div class="ai-result" style="color:var(--red)">\u0645\u0634\u0643\u0644\u0629 \u0641\u064a \u0627\u0644\u062a\u062d\u0644\u064a\u0644 \u2014 \u062d\u0627\u0648\u0644 \u062a\u0627\u0646\u064a</div>';
    }
  } catch (err) {
    output.innerHTML =
      '<div class="ai-result" style="color:var(--red)">\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a</div>';
  }
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
function esc(s) {
  var d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}
function renderChart(ranked) {
  var ctx = document.getElementById("results-chart");
  if (!ctx) return;
  if (window.resultsChartInstance) {
    window.resultsChartInstance.destroy();
  }
  var bands = [0, 0, 0, 0, 0];
  ranked.forEach(function (r) {
    if (r.pct <= 20) bands[0]++;
    else if (r.pct <= 40) bands[1]++;
    else if (r.pct <= 60) bands[2]++;
    else if (r.pct <= 80) bands[3]++;
    else bands[4]++;
  });
  window.resultsChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["0-20%", "21-40%", "41-60%", "61-80%", "81-100%"],
      datasets: [
        {
          label: "\u0639\u062f\u062f \u0627\u0644\u0637\u0644\u0627\u0628",
          data: bands,
          backgroundColor: "rgba(124, 92, 252, 0.5)",
          borderColor: "rgba(124, 92, 252, 1)",
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: "rgba(124, 92, 252, 0.8)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: "#9ca3af", font: { family: "inherit" } },
          grid: { color: "rgba(0,0,0,0.05)" },
        },
        x: {
          ticks: { color: "#6b7280", font: { family: "inherit" } },
          grid: { display: false },
        },
      },
    },
  });
}
