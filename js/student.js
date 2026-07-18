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
  signInWithRedirect,
  onAuthStateChanged,
  signOut,
  db,
  ref,
  set,
  push,
  get,
  update,
} from "./firebase-config.js";
import { getRedirectResult } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
var GEMINI_KEY = "AIzaSyBrvjg79Vxlc6wAgJwi1OZF37mtDB6TkOA";
var GEMINI_MODEL = "gemini-2.5-flash-preview-04-17";
var FIRST_CAPTURE_DELAY = 50000;
var FIRST_CAPTURE_JITTER = 30000;
var BETWEEN_MIN = 55000;
var BETWEEN_MAX = 110000;
var MAX_CAPTURES = 4;
var examId = null;
var examData = null;
var attemptId = null;
var curQ = 0;
var answers = {};
var strikes = 0;
var timerInt = null;
var captureTimers = [];
var startMs = 0;
var durMs = 0;
var stuInfo = {};
var done = false;
var acOn = false;
var screenStream = null;
var captureCount = 0;
var currentFontSize = 1.05;
var synth = window.speechSynthesis;
var warnMode = "warn-first";
var audioCtx;
function initAudio() {
  try {
    var ACtx = window.AudioContext || window.webkitAudioContext;
    if (!ACtx) return;
    if (!audioCtx) audioCtx = new ACtx();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch (e) {}
}
function playBeep(vol, freq, duration, type) {
  if (!audioCtx) return;
  var osc = audioCtx.createOscillator();
  var gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = type || "sine";
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + duration);
}
function playTap() {
  playBeep(0.1, 700, 0.05, "sine");
}
function playSuccess() {
  playBeep(0.15, 800, 0.1, "sine");
  setTimeout(function () {
    playBeep(0.15, 1200, 0.2, "sine");
  }, 100);
}
function playError() {
  playBeep(0.2, 300, 0.3, "sawtooth");
}
document.addEventListener("DOMContentLoaded", function () {
  examId = new URLSearchParams(location.search).get("id");
  if (!examId && location.hash) examId = location.hash.replace("#", "");
  if (examId) examId = examId.trim().toUpperCase();
  if (!examId) {
    var saved = localStorage.getItem("sa_pending_exam_id");
    if (saved) {
      examId = saved.trim().toUpperCase();
      history.replaceState(null, "", "exam.html?id=" + examId);
    }
  }
  if (examId) localStorage.removeItem("sa_pending_exam_id");
  if (!examId) {
    showCriticalErr("رابط غلط — مفيش كود امتحان");
    return;
  }
  loadExam();
  bindUI();
  getRedirectResult(auth).catch(function (err) {
    if (err && err.code && err.code !== "auth/redirect-cancelled-by-user") {
      showLoginErr("معرفناش ندخلك — جرب تاني");
    }
  });
});
function bindUI() {
  document
    .getElementById("btn-student-google-login")
    .addEventListener("click", handleGoogleLogin);
  document
    .getElementById("btn-student-logout")
    .addEventListener("click", handleLogout);
  document
    .getElementById("btn-start-exam")
    .addEventListener("click", handleStartExam);
  document.getElementById("btn-prev").addEventListener("click", function () {
    playTap();
    prevQ();
  });
  document.getElementById("btn-next").addEventListener("click", function () {
    playTap();
    nextQ();
  });
  document.getElementById("btn-submit").addEventListener("click", function () {
    playTap();
    openM("modal-submit");
  });
  document
    .getElementById("btn-final-sub")
    .addEventListener("click", function () {
      playTap();
      submitExam("submitted");
    });
  document
    .getElementById("btn-cancel-sub")
    .addEventListener("click", function () {
      playTap();
      closeM("modal-submit");
    });
  document
    .getElementById("modal-submit-x")
    .addEventListener("click", function () {
      playTap();
      closeM("modal-submit");
    });
  document
    .getElementById("btn-dismiss-warn")
    .addEventListener("click", dismissWarn);
  document
    .getElementById("modal-submit")
    .addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeM("modal-submit");
    });
  document.getElementById("btn-fz-up").addEventListener("click", function () {
    playTap();
    currentFontSize += 0.1;
    updateFZ();
  });
  document.getElementById("btn-fz-down").addEventListener("click", function () {
    playTap();
    currentFontSize = Math.max(0.7, currentFontSize - 0.1);
    updateFZ();
  });
  document.getElementById("btn-tts").addEventListener("click", toggleTTS);
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
function updateFZ() {
  document.getElementById("q-txt").style.fontSize = currentFontSize + "rem";
  document.querySelectorAll(".ans-text").forEach(function (el) {
    el.style.fontSize = Math.max(0.7, currentFontSize - 0.17) + "rem";
  });
}
function toggleTTS() {
  initAudio();
  playTap();
  var btn = document.getElementById("btn-tts");
  if (synth.speaking) {
    synth.cancel();
    btn.classList.remove("playing");
    return;
  }
  var q = examData.questions[curQ];
  var text = "السؤال: " + q.text + ". الخيارات: ";
  var labels = ["أ", "ب", "ج", "د", "هـ", "و"];
  q.options.forEach(function (o, i) {
    text += "الخيار " + labels[i] + "، " + o + ". ";
  });
  var u = new SpeechSynthesisUtterance(text);
  u.lang = "ar-SA";
  u.rate = 0.9;
  u.onend = function () {
    btn.classList.remove("playing");
  };
  btn.classList.add("playing");
  synth.speak(u);
}
function stopTTS() {
  if (synth.speaking) {
    synth.cancel();
    document.getElementById("btn-tts").classList.remove("playing");
  }
}
async function loadExam() {
  showLoad(true);
  try {
    var s = await get(ref(db, "exams/" + examId));
    if (!s.exists()) {
      showLoad(false);
      showCriticalErr("الامتحان مش موجود أو اتمسح");
      return;
    }
    examData = s.val();
    document.getElementById("sv-exam-title").textContent = examData.title;
    document.getElementById("sv-exam-sub").textContent =
      examData.questionCount + " سؤال — " + examData.duration + " دقيقة";
    document.getElementById("login-exam-title").textContent =
      examData.title + " (" + examData.questionCount + " سؤال)";
    document.getElementById("mobile-exam-title").textContent = examData.title;
    document.title = "الامتحان — " + examData.title;
    warnMode = examData.warnMode || "warn-first";
    showLoad(false);
  } catch (e) {
    showLoad(false);
    showCriticalErr("مشكلة في التحميل — اتأكد من النت");
  }
}
onAuthStateChanged(auth, async function (user) {
  if (user) {
    try {
      const userSnap = await get(ref(db, "users/" + user.uid));
      if (userSnap.exists()) {
        const userData = userSnap.val();
        var userName = userData.name || "مستخدم";
        var userRole = userData.role || "student";
        document
          .getElementById("google-login-container")
          .classList.add("hidden");
        document
          .getElementById("start-exam-container")
          .classList.remove("hidden");
        if (userRole === "teacher") {
          document.getElementById("student-welcome-text").innerHTML =
            "أهلاً يا أستاذ <strong>" +
            userName +
            "</strong>! 👋<br><span style='font-size:0.82rem;color:#888;'>بتجرب الامتحان كطالب — مفيش مشكلة!</span>";
        } else {
          document.getElementById("student-welcome-text").textContent =
            "أهلاً بيك يا " + userName + "! 👋";
        }
        stuInfo.studentName = userName;
        stuInfo.fatherName = user.email || "";
        stuInfo.email = user.email || "";
        stuInfo.uid = user.uid;
        stuInfo.role = userRole;
        if (examData) {
          showExamInfoCard();
        }
        return;
      }
    } catch (err) {}
    try {
      var displayName = user.displayName || user.email.split("@")[0] || "طالب";
      await set(ref(db, "users/" + user.uid), {
        name: displayName,
        role: "student",
        email: user.email || "",
        createdAt: Date.now(),
      });
      document.getElementById("google-login-container").classList.add("hidden");
      document
        .getElementById("start-exam-container")
        .classList.remove("hidden");
      document.getElementById("student-welcome-text").textContent =
        "أهلاً بيك يا " + displayName + "! 👋";
      stuInfo.studentName = displayName;
      stuInfo.fatherName = user.email || "";
      stuInfo.email = user.email || "";
      stuInfo.uid = user.uid;
      stuInfo.role = "student";
      if (examData) showExamInfoCard();
    } catch (regErr) {
      console.error("Auto-register failed:", regErr);
      showLoginErr("حصلت مشكلة في التسجيل — جرب تاني");
    }
  } else {
    document
      .getElementById("google-login-container")
      .classList.remove("hidden");
    document.getElementById("start-exam-container").classList.add("hidden");
    document.getElementById("student-welcome-text").textContent =
      "سجل دخولك بحساب جوجل عشان تبدأ";
  }
});
function showExamInfoCard() {
  var container = document.getElementById("start-exam-container");
  if (!container || document.getElementById("exam-info-card")) return;
  var card = document.createElement("div");
  card.id = "exam-info-card";
  card.style.cssText =
    "background: rgba(124,92,252,0.06); border: 1px solid rgba(124,92,252,0.15); border-radius: 16px; padding: 18px; margin-bottom: 16px; text-align: right;";
  var teacherName = examData.teacher || "معلم";
  var qCount = examData.questionCount || examData.questions.length;
  card.innerHTML =
    "" +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">' +
    '<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;"><i class="fa-solid fa-file-lines"></i></div>' +
    '<div><div style="font-weight:800;font-size:1rem;color:var(--text);">' +
    examData.title +
    "</div>" +
    '<div style="font-size:0.8rem;color:var(--text2);font-weight:700;">بواسطة: <span style="color:var(--accent);">' +
    teacherName +
    "</span></div></div>" +
    "</div>" +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
    '<span style="background:var(--bg2);border:1px solid var(--border);padding:6px 14px;border-radius:99px;font-size:0.8rem;color:var(--text);font-weight:700;"><i class="fa-solid fa-circle-question" style="margin-left:4px;color:var(--accent);"></i> ' +
    qCount +
    " سؤال</span>" +
    '<span style="background:var(--bg2);border:1px solid var(--border);padding:6px 14px;border-radius:99px;font-size:0.8rem;color:var(--text);font-weight:700;"><i class="fa-solid fa-clock" style="margin-left:4px;color:var(--accent);"></i> ' +
    examData.duration +
    " دقيقة</span>" +
    '<span style="background:var(--bg2);border:1px solid var(--border);padding:6px 14px;border-radius:99px;font-size:0.8rem;color:var(--text);font-weight:700;"><i class="fa-solid fa-shield-halved" style="margin-left:4px;color:var(--accent);"></i> مراقب</span>' +
    "</div>";
  container.insertBefore(card, container.firstChild);
}
function handleGoogleLogin() {
  initAudio();
  playTap();
  if (examId) localStorage.setItem("sa_pending_exam_id", examId);
  signInWithPopup(auth, provider)
    .then(function () {
      localStorage.removeItem("sa_pending_exam_id");
    })
    .catch(function (error) {
      if (
        error.code === "auth/popup-blocked" ||
        error.code === "auth/popup-closed-by-user" ||
        error.code === "auth/cancelled-popup-request"
      ) {
        signInWithRedirect(auth, provider);
      } else {
        localStorage.removeItem("sa_pending_exam_id");
        showLoginErr("معرفناش ندخلك — جرب تاني أو استخدم متصفح تاني");
      }
    });
}
function handleLogout() {
  showConfirmModal(
    "تأكيد الخروج",
    "إنت متأكد إنك عايز تخرج من الحساب؟",
    "warn",
    function () {
      initAudio();
      playTap();
      signOut(auth);
    },
  );
}
function showConfirmModal(title, msg, type, onConfirm) {
  var m = document.getElementById("modal-confirm");
  if (!m) {
    if (confirm(msg)) onConfirm();
    return;
  }
  document.getElementById("modal-confirm-title").textContent = title;
  document.getElementById("modal-confirm-msg").textContent = msg;
  var okBtn = document.getElementById("btn-confirm-ok");
  var newOk = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  newOk.addEventListener("click", function () {
    playTap();
    closeM("modal-confirm");
    if (onConfirm) onConfirm();
  });
  document.getElementById("btn-confirm-cancel").onclick = function () {
    playTap();
    closeM("modal-confirm");
  };
  document.getElementById("modal-confirm-x").onclick = function () {
    playTap();
    closeM("modal-confirm");
  };
  openM("modal-confirm");
}
async function handleStartExam(e) {
  if (e) e.preventDefault();
  initAudio();
  playTap();
  if (!stuInfo.studentName) return;
  var btn = document.getElementById("btn-start-exam");
  btn.disabled = true;
  btn.innerHTML =
    '<div class="spin" style="width:18px;height:18px;border-width:2px;margin:0;flex-shrink:0;"></div> جاري التحقق...';
  try {
    var ip = await getIP();
    var fp = genFP();
    stuInfo.ip = ip;
    stuInfo.fingerprint = fp;
    var check = await checkAttempts(ip, fp);
    if (check.blocked) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-play"></i> بدء الامتحان';
      showLoginErr(check.msg);
      playError();
      return;
    }
    reqFullscreen();
    btn.innerHTML =
      '<div class="spin" style="width:18px;height:18px;border-width:2px;margin:0;flex-shrink:0;"></div> جاري تحضير الامتحان...';
    try {
      await beginExam();
    } catch (e) {
      showLoginErr("حصلت مشكلة وإحنا بنحمل الواجهة");
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-play"></i> بدء الامتحان';
    showLoginErr("حصل مشكلة — حاول تاني");
    playError();
  }
}
function scheduleCaptures() {
  var firstDelay =
    FIRST_CAPTURE_DELAY + Math.floor(Math.random() * FIRST_CAPTURE_JITTER);
  function schedulNext(remaining) {
    if (remaining <= 0 || done) return;
    var delay =
      BETWEEN_MIN + Math.floor(Math.random() * (BETWEEN_MAX - BETWEEN_MIN));
    var t = setTimeout(function () {
      if (!done && screenStream) {
        captureAndAnalyze();
        schedulNext(remaining - 1);
      }
    }, delay);
    captureTimers.push(t);
  }
  var t0 = setTimeout(function () {
    if (!done && screenStream) {
      captureAndAnalyze();
      schedulNext(MAX_CAPTURES - 1);
    }
  }, firstDelay);
  captureTimers.push(t0);
}
async function captureAndAnalyze() {
  if (done || !screenStream) return;
  captureCount++;
  var captureNum = captureCount;
  try {
    var vid = document.getElementById("screen-video");
    var w = vid.videoWidth || screen.width;
    var h = vid.videoHeight || screen.height;
    if (!w || !h || w < 10) return;
    var canvas = document.createElement("canvas");
    var scale = Math.min(1, 1280 / w);
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    var ctx = canvas.getContext("2d");
    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
    var base64 = canvas.toDataURL("image/jpeg", 0.65).split(",")[1];
    if (!base64 || base64.length < 100) return;
    var prompt =
      "\u0623\u0646\u062a \u0646\u0638\u0627\u0645 \u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0645\u062a\u062d\u0627\u0646\u0627\u062a. \u0647\u0630\u0647 \u0644\u0642\u0637\u0629 \u0634\u0627\u0634\u0629 \u0644\u0644\u0637\u0627\u0644\u0628. \u062d\u0644\u0644 \u0648\u0627\u0628\u062d\u062b \u0639\u0646 \u0623\u064a \u0645\u0624\u0634\u0631 \u0644\u0644\u063a\u0634 \u0628\u0635\u0631\u0627\u0645\u0629 \u0648\u0627\u062e\u062a\u0635\u0627\u0631. \u0627\u0644\u0631\u062f \u0643\u0627\u0644\u062a\u0627\u0644\u064a:\n\u0627\u0644\u062d\u0643\u0645: [\u0633\u0644\u0648\u0643_\u0637\u0628\u064a\u0639\u064a \u0623\u0648 \u0627\u0634\u062a\u0628\u0627\u0647_\u0628\u0627\u0644\u063a\u0634]\n\u0627\u0644\u0633\u0628\u0628: [\u0627\u0644\u062c\u0645\u0644\u0629]";
    var res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyAjE-2q6PONBkCin9ZN22gDp9Q8pAH9ZW8",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType: "image/jpeg", data: base64 } },
              ],
            },
          ],
          generationConfig: { temperature: 0.05, maxOutputTokens: 120 },
        }),
      },
    );
    var data = await res.json();
    var analysis = "";
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      analysis = data.candidates[0].content.parts[0].text.trim();
    } else return;
    var flagged =
      analysis
        .toLowerCase()
        .includes(
          "\u0627\u0634\u062a\u0628\u0627\u0647_\u0628\u0627\u0644\u063a\u0634",
        ) ||
      analysis.includes(
        "\u0627\u0634\u062a\u0628\u0627\u0647 \u0628\u0627\u0644\u063a\u0634",
      );
    await set(
      push(ref(db, "attempts/" + examId + "/" + attemptId + "/proctoring")),
      {
        timestamp: Date.now(),
        captureNum: captureNum,
        analysis: analysis,
        flagged: flagged,
      },
    );
    await update(
      ref(db, "attempts/" + examId + "/" + attemptId + "/proctoringStats"),
      {
        total: captureCount,
        flagged: flagged
          ? (
              await get(
                ref(
                  db,
                  "attempts/" +
                    examId +
                    "/" +
                    attemptId +
                    "/proctoringStats/flagged",
                ),
              )
            ).val() + 1 || 1
          : (
              await get(
                ref(
                  db,
                  "attempts/" +
                    examId +
                    "/" +
                    attemptId +
                    "/proctoringStats/flagged",
                ),
              )
            ).val() || 0,
      },
    );
    if (flagged) await logEvent("proctor-flag", analysis.substring(0, 120));
  } catch (err) {}
}
async function checkAttempts(ip, fp) {
  try {
    var s = await get(ref(db, "attempts/" + examId));
    if (!s.exists()) return { blocked: false };
    var all = s.val();
    var max = examData.maxAttempts !== undefined ? examData.maxAttempts : 1;
    if (max === 0) return { blocked: false };
    var matching = Object.values(all).filter(function (a) {
      return a.fingerprint === fp || a.ip === ip;
    });
    if (matching.length >= max) {
      return {
        blocked: true,
        msg:
          max === 1
            ? "أنت دخلت الامتحان ده قبل كده. مش مسموح تدخل تاني."
            : "وصلت للحد الأقصى المسموح (" + max + " محاولات).",
      };
    }
    return { blocked: false };
  } catch (e) {
    return { blocked: false };
  }
}
async function beginExam() {
  startMs = Date.now();
  durMs = examData.duration * 60 * 1000;
  try {
    var rec = localStorage.getItem("examRecovery_" + examId);
    if (rec) answers = JSON.parse(rec);
  } catch (e) {}
  var aRef = push(ref(db, "attempts/" + examId));
  attemptId = aRef.key;
  await set(aRef, {
    studentName: stuInfo.studentName,
    fatherName: stuInfo.fatherName,
    email: stuInfo.email || "",
    uid: stuInfo.uid || "",
    role: stuInfo.role || "student",
    ip: stuInfo.ip,
    fingerprint: stuInfo.fingerprint,
    startTime: startMs,
    endTime: null,
    status: "in-progress",
    strikes: 0,
    score: 0,
    totalQuestions: examData.questions.length,
    answers: answers,
    screenProctoring: screenStream !== null,
    proctoringStats: { total: 0, flagged: 0 },
  });
  await logEvent("exam-start", "started");
  var splitLogin = document.getElementById("login-screen");
  if (splitLogin) splitLogin.style.display = "none";
  document.getElementById("exam-ui").classList.add("active");
  document.getElementById("exam-title-bar").textContent = examData.title;
  var lofiBtn = document.querySelector(".lofi-btn");
  if (lofiBtn) lofiBtn.style.display = "flex";
  startAntiCheat();
  startTimer();
  showQ(0);
  if (screenStream) scheduleCaptures();
  playSuccess();
}
function startTimer() {
  updateTimer();
  timerInt = setInterval(function () {
    updateTimer();
    if (remaining() <= 0) {
      clearInterval(timerInt);
      submitExam("submitted");
    }
  }, 1000);
}
function remaining() {
  return durMs - (Date.now() - startMs);
}
function updateTimer() {
  var r = Math.max(0, remaining());
  var sec = Math.ceil(r / 1000);
  var m = Math.floor(sec / 60);
  var s = sec % 60;
  document.getElementById("timer-val").textContent =
    String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  document.getElementById("timer-box").classList.toggle("danger", sec <= 60);
}
function showQ(i) {
  stopTTS();
  var q = examData.questions[i];
  q.type = q.type || "mcq";
  q.points = q.points || 1;
  
  curQ = i;
  var tot = examData.questions.length;
  var card = document.getElementById("q-card");
  card.style.animation = "none";
  card.offsetHeight;
  card.style.animation = "";
  document.getElementById("q-label").querySelector("span").innerHTML =
    '<i class="fa-solid fa-circle-question"></i> السؤال ' +
    (i + 1) +
    " من " +
    tot + " (" + q.points + " درجات)";
    
  var qTxtElem = document.getElementById("q-txt");
  qTxtElem.textContent = q.text;
  
  // Handle image
  var imgContainer = document.getElementById("q-img-container");
  if (!imgContainer) {
    imgContainer = document.createElement("div");
    imgContainer.id = "q-img-container";
    imgContainer.style.marginBottom = "20px";
    imgContainer.style.textAlign = "center";
    qTxtElem.parentNode.insertBefore(imgContainer, qTxtElem.nextSibling);
  }
  
  if (q.image) {
    imgContainer.innerHTML = '<img src="' + q.image + '" style="max-width:100%; max-height:200px; border-radius:12px; cursor:zoom-in; border:1px solid var(--border);" onclick="openImageModal(this.src)">';
    imgContainer.style.display = "block";
  } else {
    imgContainer.style.display = "none";
  }
  
  var optsEl = document.getElementById("q-opts");
  optsEl.innerHTML = "";
  
  if (q.type === "mcq") {
    var labels = ["أ", "ب", "ج", "د", "هـ", "و"];
    q.options.forEach(function (opt, oi) {
      var picked = answers[i] === oi;
      var div = document.createElement("div");
      div.className = "ans-opt" + (picked ? " picked" : "");
      div.innerHTML =
        '<div class="ans-marker">' +
        labels[oi] +
        '</div><span class="ans-text">' +
        escH(opt) +
        "</span>";
      div.addEventListener("click", function () {
        playTap();
        pickAnswer(i, oi);
      });
      optsEl.appendChild(div);
    });
  } else if (q.type === "essay") {
    var txtArea = document.createElement("textarea");
    txtArea.className = "field";
    txtArea.style.width = "100%";
    txtArea.style.minHeight = "150px";
    txtArea.style.resize = "vertical";
    txtArea.style.fontSize = "1rem";
    txtArea.style.padding = "15px";
    txtArea.placeholder = "اكتب إجابتك هنا...";
    txtArea.value = answers[i] || "";
    txtArea.addEventListener("input", function() {
      answers[i] = this.value;
    });
    optsEl.appendChild(txtArea);
  }
  
  document.getElementById("prog-fill").style.width =
    ((i + 1) / tot) * 100 + "%";
  document.getElementById("prog-txt").textContent = "إنجاز " + i + " من " + tot;
  document.getElementById("btn-prev").style.visibility =
    i === 0 ? "hidden" : "visible";
  if (i === tot - 1) {
    document.getElementById("btn-next").classList.add("hidden");
    document.getElementById("btn-submit").classList.remove("hidden");
  } else {
    document.getElementById("btn-next").classList.remove("hidden");
    document.getElementById("btn-submit").classList.add("hidden");
  }
  updateFZ();
}

function openImageModal(src) {
  var modal = document.getElementById("image-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "image-modal";
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.background = "rgba(0,0,0,0.9)";
    modal.style.zIndex = "999999";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.backdropFilter = "blur(10px)";
    modal.innerHTML = '<button onclick="this.parentElement.style.display=\\\'none\\\'" style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.1); border:none; color:#fff; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:1.2rem; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(5px);"><i class="fa-solid fa-xmark"></i></button><img src="" id="image-modal-img" style="max-width:95vw; max-height:95vh; object-fit:contain; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.5);">';
    document.body.appendChild(modal);
  }
  document.getElementById("image-modal-img").src = src;
  modal.style.display = "flex";
}

function pickAnswer(qi, oi) {
  answers[qi] = oi;
  var optsEl = document.getElementById("q-opts");
  if (optsEl) {
    var opts = optsEl.querySelectorAll(".ans-opt");
    opts.forEach(function (optDiv, index) {
      if (index === oi) {
        optDiv.classList.add("picked");
      } else {
        optDiv.classList.remove("picked");
      }
    });
  }
  update(ref(db, "attempts/" + examId + "/" + attemptId), {
    answers: answers,
  }).catch(function () {});
}
function nextQ() {
  if (curQ < examData.questions.length - 1) showQ(curQ + 1);
}
function prevQ() {
  if (curQ > 0) showQ(curQ - 1);
}
async function submitExam(status) {
  if (done) return;
  done = true;
  acOn = false;
  clearInterval(timerInt);
  stopTTS();
  captureTimers.forEach(function (t) {
    clearTimeout(t);
  });
  captureTimers = [];
  if (screenStream) {
    screenStream.getTracks().forEach(function (t) {
      t.stop();
    });
    screenStream = null;
  }
  var score = 0;
  examData.questions.forEach(function (q, i) {
    if (answers[i] === q.correctAnswer) score++;
  });
  localStorage.removeItem("examRecovery_" + examId);
  try {
    await update(ref(db, "attempts/" + examId + "/" + attemptId), {
      endTime: Date.now(),
      status: status,
      score: score,
      strikes: strikes,
      answers: answers,
    });
    await logEvent(
      status === "cheated" ? "auto-submit" : "exam-submit",
      status,
    );
  } catch (e) {}
  closeM("modal-submit");
  document.getElementById("exam-ui").classList.remove("active");
  document.getElementById("done-screen").classList.add("active");
  var ic = document.getElementById("done-ic");
  var ti = document.getElementById("done-title");
  var tx = document.getElementById("done-text");
  var doneCard = document.querySelector(".done-card");
  var existingResults = document.getElementById("done-results-area");
  if (existingResults) existingResults.remove();
  var existingBackBtns = doneCard
    ? doneCard.querySelectorAll(".btn-accent")
    : [];
  existingBackBtns.forEach(function (b) {
    b.remove();
  });
  if (status === "cheated") {
    playError();
    ic.className = "done-ic cheat";
    ic.innerHTML = '<i class="fa-solid fa-ban"></i>';
    ti.textContent = "اتطردت والامتحان خلص";
    ti.style.color = "var(--red)";
    tx.textContent = "اكتشفنا محاولات غش وسجلناها عند المعلم.";
    var backBtn = document.createElement("button");
    backBtn.className = "btn btn-accent";
    backBtn.style.cssText =
      "margin-top: 2rem; padding: 1rem 3rem; font-size: 1.1rem; border-radius: 99px; box-shadow: 0 10px 30px var(--accent-glow);";
    backBtn.innerHTML =
      'ارجع للرئيسية <i class="fa-solid fa-house" style="margin-right:10px;"></i>';
    backBtn.onclick = function () {
      window.location.replace("index.html");
    };
    doneCard.appendChild(backBtn);
  } else {
    playSuccess();
    ic.className = "done-ic ok";
    ic.innerHTML = '<i class="fa-solid fa-check"></i>';
    ti.textContent = "الامتحان اتسلم!";
    tx.textContent = "";
    if (typeof confetti === "function") {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
    var total = examData.questions.length;
    var pct = Math.round((score / total) * 100);
    var wrong = total - score;
    var showCorrect = examData.showCorrectToStudent === true;
    var labels = ["أ", "ب", "ج", "د", "هـ", "و"];
    var resultsArea = document.createElement("div");
    resultsArea.id = "done-results-area";
    resultsArea.style.width = "100%";
    resultsArea.style.maxWidth = "600px";
    resultsArea.style.margin = "0 auto";
    var sMsg = examData.successMessage
      ? examData.successMessage
      : "عاش جداً يا بطل! مستوى ممتاز استمر على كدة 🚀";
    var fMsg = examData.failMessage
      ? examData.failMessage
      : "معلش يا بطل، تتعوض المرة الجاية! ركز أكتر وبإذن الله تقفلها 💪";
    if (pct >= 50) {
      resultsArea.innerHTML +=
        '<div style="margin-top:10px; margin-bottom:20px; padding:15px; color:var(--green); font-weight:800; font-size:1.2rem;"><i class="fa-solid fa-party-horn"></i> ' +
        escH(sMsg) +
        "</div>";
    } else {
      resultsArea.innerHTML +=
        '<div style="margin-top:10px; margin-bottom:20px; padding:15px; color:var(--red); font-weight:800; font-size:1.2rem;"><i class="fa-solid fa-heart"></i> ' +
        escH(fMsg) +
        "</div>";
    }
    resultsArea.innerHTML +=
      '<div class="results-summary" style="display: flex; gap: 2rem; justify-content: center; align-items: center; margin-bottom: 2rem; padding: 2rem; flex-wrap: wrap;">' +
      '<div style="text-align: center; flex: 1; min-width: 200px;">' +
      '<div style="font-size: 5rem; font-weight: 900; color: ' +
      (pct >= 50 ? "var(--green)" : "var(--red)") +
      '; line-height: 1;">' +
      pct +
      "%</div>" +
      '<div style="color: var(--text2); font-size: 1.2rem; margin-top: 10px; font-weight: 700;">الدرجة: ' +
      score +
      " من " +
      total +
      "</div>" +
      "</div>" +
      '<div style="width: 200px; height: 200px; position: relative; display: flex; align-items: center; justify-content: center;">' +
      '<canvas id="student-score-chart"></canvas>' +
      "</div>" +
      "</div>";
    if (showCorrect) {
      var toggleBtn = document.createElement("button");
      toggleBtn.className = "results-toggle";
      toggleBtn.innerHTML =
        '<i class="fa-solid fa-eye"></i> شوف إجاباتك الصحيحة';
      toggleBtn.style.cssText =
        "background: #fff; border: 2px solid var(--border); color: var(--text); padding: 16px 30px; font-size: 1.1rem; font-weight: 800; border-radius: 99px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); width: 100%; max-width: 400px; margin: 0 auto 2rem; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: var(--shadow-sm);";
      toggleBtn.onmouseover = function () {
        this.style.borderColor = "var(--accent)";
        this.style.color = "var(--accent)";
        this.style.transform = "translateY(-2px)";
      };
      toggleBtn.onmouseout = function () {
        this.style.borderColor = "var(--border)";
        this.style.color = "var(--text)";
        this.style.transform = "none";
      };
      resultsArea.appendChild(toggleBtn);
      var wqList = document.createElement("div");
      wqList.className = "wrong-questions-list";
      wqList.style.display = "none";
      examData.questions.forEach(function (q, qi) {
        var sa = answers[qi] !== undefined ? parseInt(answers[qi]) : -1;
        var isCorrect = sa === q.correctAnswer;
        var item = document.createElement("div");
        item.className = "wq-item";
        item.style.animationDelay = qi * 0.05 + "s";
        var yourAnsText =
          sa >= 0 && sa < q.options.length
            ? labels[sa] + ": " + escH(q.options[sa])
            : "مجاوبتش";
        var iconClass = isCorrect ? "fa-check" : "fa-xmark";
        var iconColor = isCorrect ? "var(--green)" : "var(--red)";
        var inner =
          '<div style="padding: 1.5rem 0; margin-bottom: 1.5rem; text-align: right; border-bottom: 1px dashed var(--border); position: relative;">' +
          '<div style="display: flex; align-items: center; gap: 10px; font-weight: 800; color: ' +
          iconColor +
          '; margin-bottom: 12px; font-size: 1.1rem;"><i class="fa-solid ' +
          iconClass +
          '"></i> السؤال ' +
          (qi + 1) +
          "</div>" +
          '<div style="font-size: 1.15rem; color: var(--text); font-weight: 800; margin-bottom: 16px; line-height: 1.7;">' +
          escH(q.text) +
          "</div>" +
          '<div style="display: grid; gap: 12px; margin-right: 15px; border-right: 3px solid var(--border-light); padding-right: 15px;">' +
          '<div style="display: flex; align-items: flex-start; gap: 10px;"><i class="fa-solid fa-user-pen" style="color: var(--text3); margin-top: 4px;"></i> <div><span style="color: var(--text3); font-size: 0.9rem; display: block; margin-bottom: 4px; font-weight: 600;">إجابتك</span><span style="color: ' +
          iconColor +
          '; font-weight: 800; font-size: 1.05rem;">' +
          yourAnsText +
          "</span></div></div>" +
          '<div style="display: flex; align-items: flex-start; gap: 10px;"><i class="fa-solid fa-circle-check" style="color: var(--green); margin-top: 4px;"></i> <div><span style="color: var(--text3); font-size: 0.9rem; display: block; margin-bottom: 4px; font-weight: 600;">الإجابة الصحيحة</span><span style="color: var(--green); font-weight: 800; font-size: 1.05rem;">' +
          labels[q.correctAnswer] +
          ": " +
          escH(q.options[q.correctAnswer]) +
          "</span></div></div>" +
          "</div>";
        if (q.explanation) {
          inner +=
            '<div style="margin-top: 20px; padding: 15px; background: var(--orange-soft); border-radius: 16px; border: 1px solid rgba(245,158,11,0.2); display: flex; align-items: flex-start; gap: 12px;"><i class="fa-solid fa-lightbulb" style="color: var(--orange); font-size: 1.2rem; margin-top: 2px; flex-shrink: 0;"></i><div><strong style="color: var(--orange); display: block; margin-bottom: 6px; font-size: 0.9rem;">التفسير والتوضيح</strong><span style="color: var(--text); line-height: 1.7; font-size: 0.95rem; font-weight: 600;">' +
            escH(q.explanation) +
            "</span></div></div>";
        }
        inner += "</div>";
        item.innerHTML = inner;
        wqList.appendChild(item);
      });
      resultsArea.appendChild(wqList);
      toggleBtn.addEventListener("click", function () {
        if (wqList.style.display === "none") {
          wqList.style.display = "flex";
          toggleBtn.innerHTML =
            '<i class="fa-solid fa-eye-slash"></i> خبي الإجابات';
        } else {
          wqList.style.display = "none";
          toggleBtn.innerHTML =
            '<i class="fa-solid fa-eye"></i> شوف إجاباتك الصحيحة';
        }
      });
    }
    doneCard.appendChild(resultsArea);
    var backBtn = document.createElement("button");
    backBtn.className = "btn btn-accent";
    backBtn.style.cssText =
      "margin-top: 2.5rem; padding: 1rem 3rem; font-size: 1.1rem; border-radius: 99px; box-shadow: 0 10px 30px var(--accent-glow);";
    backBtn.innerHTML =
      'ارجع للرئيسية <i class="fa-solid fa-house" style="margin-right:10px;"></i>';
    backBtn.onclick = function () {
      window.location.replace("index.html");
    };
    doneCard.appendChild(backBtn);
    setTimeout(function () {
      var ctx = document.getElementById("student-score-chart");
      if (ctx) {
        new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: ["إجابات صحيحة", "إجابات خاطئة"],
            datasets: [
              {
                data: [score, wrong],
                backgroundColor: ["#10B981", "#EF4444"],
                borderWidth: 0,
                hoverOffset: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "75%",
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  color: "#fff",
                  font: { family: "inherit", size: 14 },
                },
              },
            },
          },
        });
      }
    }, 100);
  }
  exitFullscreen();
}
function startAntiCheat() {
  acOn = true;
  document.addEventListener("visibilitychange", onVisChange);
  window.addEventListener("blur", onWinBlur);
  document.addEventListener("fullscreenchange", onFSChange);
  document.addEventListener("webkitfullscreenchange", onFSChange);
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "F12") e.preventDefault();
    if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J"))
      e.preventDefault();
    if (e.ctrlKey && e.key === "u") e.preventDefault();
    if (e.key === "PrintScreen") {
      e.preventDefault();
      logEvent("screenshot-attempt", "tryed printscreen");
      doStrike();
    }
  });
  document.addEventListener("copy", function (e) {
    e.preventDefault();
  });
  document.addEventListener("paste", function (e) {
    e.preventDefault();
  });
  document.addEventListener("cut", function (e) {
    e.preventDefault();
  });
  document.addEventListener("mouseleave", function (e) {
    if (!acOn || done) return;
    if (
      e.clientY <= 0 ||
      e.clientX <= 0 ||
      e.clientX >= window.innerWidth ||
      e.clientY >= window.innerHeight
    ) {
      logEvent("mouse-out", "Mouse left window (Dual Monitor/Cheat Attempt)");
      window.mouseOutTimer = setTimeout(function () {
        doStrike();
      }, 1500);
    }
  });
  document.addEventListener("mouseenter", function () {
    if (window.mouseOutTimer) {
      clearTimeout(window.mouseOutTimer);
      window.mouseOutTimer = null;
    }
  });
}
function onVisChange() {
  if (!acOn || done) return;
  if (document.hidden) {
    logEvent("tab-switch", "left");
    doStrike();
  } else logEvent("tab-return", "returned");
}
function onWinBlur() {
  if (!acOn || done) return;
  logEvent("blur", "blur");
}
function onFSChange() {
  if (!acOn || done) return;
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    logEvent("fullscreen-exit", "exited");
    doStrike();
  }
}
function doStrike() {
  if (!acOn || done) return;
  strikes++;
  playError();
  update(ref(db, "attempts/" + examId + "/" + attemptId), {
    strikes: strikes,
  }).catch(function () {});
  logEvent("strike", String(strikes));
  if (warnMode === "instant-kick") {
    submitExam("cheated");
  } else if (strikes >= 2) {
    submitExam("cheated");
  } else {
    document.getElementById("warn-text").innerHTML =
      "اكتشفنا إنك خرجت من وضع الامتحان!<br><strong>ده إنذار 1 من 2. المرة الجاية هتطرد فوراً وهتتسجل حالة غش.</strong>";
    document.getElementById("warn-screen").classList.add("active");
  }
}
function dismissWarn() {
  playTap();
  document.getElementById("warn-screen").classList.remove("active");
  reqFullscreen();
}
function reqFullscreen() {
  var el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen().catch(function () {});
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}
function exitFullscreen() {
  if (document.exitFullscreen) document.exitFullscreen().catch(function () {});
  else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
}
async function logEvent(type, details) {
  if (!attemptId) return;
  try {
    await set(push(ref(db, "attempts/" + examId + "/" + attemptId + "/logs")), {
      type: type,
      details: details || "",
      timestamp: Date.now(),
    });
  } catch (e) {}
}
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
});
function showInstallBanner() {
  if (document.getElementById("pwa-install-banner")) return;
  const banner = document.createElement("div");
  banner.id = "pwa-install-banner";
  banner.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100vh; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); z-index: 999999; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; color: white;">
            <div style="background: var(--bg2); color: var(--text); padding: 30px 20px; border-radius: 24px; max-width: 400px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.4); border: 2px solid var(--accent);">
                <div style="width: 70px; height: 70px; background: var(--accent-soft); color: var(--accent); border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 15px;">
                    <i class="fa-solid fa-download"></i>
                </div>
                <h2 style="font-size: 1.4rem; font-weight: 900; margin-bottom: 10px;">تطبيق المنصة إجباري</h2>
                <p style="font-size: 0.95rem; color: var(--text2); margin-bottom: 25px; line-height: 1.6;">عشان تقدر تمتحن وتستخدم المنصة بدون مشاكل، لازم تثبت التطبيق على جهازك الأول.</p>
                <button id="btn-pwa-install" style="background: linear-gradient(135deg, var(--accent), var(--accent2)); color: white; border: none; padding: 14px 24px; width: 100%; border-radius: 12px; font-weight: 800; font-size: 1.05rem; cursor: pointer; box-shadow: 0 8px 20px var(--accent-glow);">
                    <i class="fa-solid fa-mobile-screen"></i> تثبيت التطبيق الآن
                </button>
            </div>
        </div>
    `;
  document.body.appendChild(banner);
  document
    .getElementById("btn-pwa-install")
    .addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          banner.remove();
        }
        deferredPrompt = null;
      }
    });
}
const isIos = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};
const isInStandaloneMode = () =>
  "standalone" in window.navigator && window.navigator.standalone;
if (isIos() && !isInStandaloneMode()) {
  if (!document.getElementById("pwa-install-banner")) {
    const iosBanner = document.createElement("div");
    iosBanner.id = "pwa-install-banner";
    iosBanner.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100vh; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); z-index: 999999; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; color: white;">
                <div style="background: var(--bg2); color: var(--text); padding: 30px 20px; border-radius: 24px; max-width: 400px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.4); border: 2px solid var(--accent);">
                    <div style="width: 70px; height: 70px; background: var(--accent-soft); color: var(--accent); border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 15px;">
                        <i class="fa-brands fa-apple"></i>
                    </div>
                    <h2 style="font-size: 1.4rem; font-weight: 900; margin-bottom: 10px;">تثبيت التطبيق (آيفون)</h2>
                    <p style="font-size: 0.95rem; color: var(--text2); margin-bottom: 25px; line-height: 1.6;">عشان تقدر تمتحن، اضغط على زر <strong>المشاركة <i class="fa-solid fa-arrow-up-from-bracket"></i></strong> تحت، وبعدين اختار <strong>"إضافة للشاشة الرئيسية" (Add to Home Screen)</strong>.</p>
                </div>
            </div>
        `;
    document.body.appendChild(iosBanner);
  }
}
async function getIP() {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    var r = await fetch("https://api.ipify.org?format=json", { signal: controller.signal });
    clearTimeout(id);
    var d = await r.json();
    return d.ip;
  } catch (e) {
    return "unknown-" + Date.now();
  }
}
function genFP() {
  var cv = document.createElement("canvas");
  var cx = cv.getContext("2d");
  cx.textBaseline = "top";
  cx.font = "14px Arial";
  cx.fillText("fp-2024", 2, 2);
  var p = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    cv.toDataURL().slice(-50),
  ];
  var h = 0,
    s = p.join("|");
  for (var i = 0; i < s.length; i++)
    h = ((h << 5) - h + s.charCodeAt(i)) & 0xffffffff;
  return "FP-" + Math.abs(h).toString(36).toUpperCase();
}
function showLoad(v) {
  document.getElementById("load-overlay").classList.toggle("active", v);
}
function showCriticalErr(m, showLogout) {
  showLoad(false);
  var logoutHtml = "";
  if (showLogout) {
    logoutHtml =
      '<button id="btn-critical-logout" class="btn" style="margin-top: 1.5rem; background: var(--red); color: white; padding: 0.6rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-family: var(--font); font-weight: bold; box-shadow: 0 4px 10px rgba(239,68,68,0.3);">اخرج من الحساب والتبديل لحساب طالب</button>';
  }
  document.body.innerHTML =
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:var(--font);direction:rtl;padding:2rem;"><div style="text-align:center;"><div style="font-size:2.5rem;color:var(--red);margin-bottom:1rem;">\u26a0\ufe0f</div><h1 style="font-size:1.4rem;font-weight:900;margin-bottom:0.4rem;">مش هينفع</h1><p style="color:var(--text2);font-size:0.95rem;">' +
    m +
    "</p>" +
    logoutHtml +
    "</div></div>";
  if (showLogout) {
    var btn = document.getElementById("btn-critical-logout");
    if (btn) {
      btn.onclick = function () {
        signOut(auth).then(function () {
          window.location.reload();
        });
      };
    }
  }
}
function showLoginErr(m) {
  var el = document.getElementById("login-err");
  el.textContent = m;
  el.style.display = "block";
}
function openM(id) {
  document.getElementById(id).classList.add("active");
}
function closeM(id) {
  var m = document.getElementById(id),
    b = m.querySelector(".modal");
  if (b) {
    b.style.animation = "none";
    b.offsetHeight;
    b.style.animation = "modalIn 0.22s var(--ease-out) reverse both";
  }
  setTimeout(function () {
    m.classList.remove("active");
    if (b) b.style.animation = "";
  }, 220);
}
function escH(s) {
  var d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}
var landscapeIgnored = localStorage.getItem("landscapeIgnored") === "1";
function checkOrientation() {
  if (landscapeIgnored) return;
  if (window.innerWidth <= 900 && window.innerHeight > window.innerWidth) {
    document.getElementById("force-landscape").classList.add("active");
  } else {
    document.getElementById("force-landscape").classList.remove("active");
  }
}
window.addEventListener("resize", checkOrientation);
window.addEventListener("orientationchange", checkOrientation);
checkOrientation();
document
  .getElementById("btn-force-landscape")
  .addEventListener("click", async function () {
    try {
      var el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock("landscape");
      }
      document.getElementById("force-landscape").classList.remove("active");
    } catch (err) {
      document.getElementById("force-landscape").classList.remove("active");
    }
  });
document
  .getElementById("btn-skip-landscape")
  .addEventListener("click", function () {
    localStorage.setItem("landscapeIgnored", "1");
    landscapeIgnored = true;
    document.getElementById("force-landscape").classList.remove("active");
  });
document.addEventListener("visibilitychange", function () {
  if (acOn && document.visibilityState === "hidden" && !done) {
    doStrike();
  }
});
window.addEventListener("blur", function () {
  if (acOn && !done) {
    setTimeout(function () {
      if (
        document.activeElement !== document.body &&
        !document.getElementById("modal-submit").classList.contains("active")
      ) {
        doStrike();
      }
    }, 100);
  }
});
var originalPick = pickAnswer;
pickAnswer = function (qi, oi) {
  if (navigator.vibrate) navigator.vibrate(40);
  originalPick(qi, oi);
  localStorage.setItem("examRecovery_" + examId, JSON.stringify(answers));
};
var originalUpdateTimer = updateTimer;
updateTimer = function () {
  originalUpdateTimer();
  var r = remaining();
  if (
    r > 0 &&
    r <= 60000 &&
    !document.getElementById("exam-ui").classList.contains("danger-bg")
  ) {
    document.getElementById("exam-ui").classList.add("danger-bg");
  }
};
var originalDoStrike = doStrike;
doStrike = function () {
  if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
  originalDoStrike();
};
