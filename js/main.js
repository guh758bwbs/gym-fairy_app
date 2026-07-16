"use strict";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  onSnapshot,
  collectionGroup,
  where,
  getDocs,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBPblX0hRGy0JQKWzSQU9-XGimJ_DuED0Y",
  authDomain: "muscle-app-e3362.firebaseapp.com",
  projectId: "muscle-app-e3362",
  storageBucket: "muscle-app-e3362.firebasestorage.app",
  messagingSenderId: "13299103681",
  appId: "1:13299103681:web:a8f0a85c08facbd4742140"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM要素の取得 ---
const authContainer = document.getElementById("auth-container");
const appContainer = document.getElementById("app-container");
const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const signupBtn = document.getElementById("signup-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const authMessage = document.getElementById("auth-message");
const userEmailSpan = document.getElementById("user-email");
const exerciseSelect = document.getElementById("exercise-select");
const preferenceSelect = document.getElementById("preference-select");
const levelSelect = document.getElementById("level-select");
const addSkillBtn = document.getElementById("add-skill-btn");
const skillList = document.getElementById("skill-list");

// --- グローバルな状態管理(ここが重要) ---
let currentUser = null;
let unsubscribeSkills = null;

// --- 新規登録 ---
signupBtn.addEventListener("click", async () => {
  authMessage.textContent = "デモ版のため新規登録は停止しています。下記のデモアカウントをご利用ください。";
});
// signupBtn.addEventListener("click", async () => {
//   const email = emailInput.value.trim();
//   const password = passwordInput.value;

//   if (!email || !password) {
//     authMessage.textContent = "メールアドレスとパスワードを入力してください";
//     return;
//   }

//   try {
//     await createUserWithEmailAndPassword(auth, email, password);
//     authMessage.textContent = "";
//   } catch (error) {
//     authMessage.textContent = translateAuthError(error.code);
//   }
// });

// --- ログイン ---
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    authMessage.textContent = "メールアドレスとパスワードを入力してください";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    authMessage.textContent = "";
  } catch (error) {
    authMessage.textContent = translateAuthError(error.code);
  }
});

// --- ログアウト ---
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// --- ログイン状態の監視(最重要・1つだけ) ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    authContainer.style.display = "none";
    appContainer.style.display = "block";
    userEmailSpan.textContent = user.email;

    await setDoc(doc(db, "users", user.uid), {
      email: user.email
    }, { merge: true });

    watchSkills(user.uid);
    watchIncomingRequests(user.uid);   // ← 追加
    watchOutgoingRequests(user.uid);   // ← 追加
  } else {
    currentUser = null;
    authContainer.style.display = "block";
    appContainer.style.display = "none";
    if (unsubscribeSkills) {
      unsubscribeSkills();
      unsubscribeSkills = null;
    }
    if (unsubscribeIncoming) {          // ← 追加
      unsubscribeIncoming();
      unsubscribeIncoming = null;
    }
    if (unsubscribeOutgoing) {          // ← 追加
      unsubscribeOutgoing();
      unsubscribeOutgoing = null;
    }
  }
});

// --- 種目を追加する ---
addSkillBtn.addEventListener("click", async () => {
  if (!currentUser) return;

  const exercise = exerciseSelect.value;
  const preference = preferenceSelect.value; // "teach" or "learn"
  const level = levelSelect.value;

  try {
    await addDoc(collection(db, "users", currentUser.uid, "skills"), {
      exercise: exercise,
      can_teach: preference === "teach",
      want_to_learn: preference === "learn",
      level: level,
      created_at: new Date()
    });
  } catch (error) {
    console.error("保存エラー:", error);
    alert("保存に失敗しました: " + error.message);
  }
});

// --- 自分の種目一覧をリアルタイムで監視・表示する ---
function watchSkills(uid) {
  const q = query(collection(db, "users", uid, "skills"));

  unsubscribeSkills = onSnapshot(q, (snapshot) => {
    skillList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const skill = docSnap.data();
      const li = document.createElement("li");
      li.classList.add(skill.can_teach ? "tag-teach" : "tag-learn");

      const info = document.createElement("span");
      info.className = "skill-info";

      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = skill.can_teach ? "教えたい" : "教えて欲しい";

      info.textContent = `${skill.exercise}（${skill.level}） `;
      info.appendChild(badge);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "削除";
      deleteBtn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "users", uid, "skills", docSnap.id));
      });

      li.appendChild(info);
      li.appendChild(deleteBtn);
      skillList.appendChild(li);
    });
  });
}

// --- DOM要素の取得(マッチング関連) ---
const searchExerciseSelect = document.getElementById("search-exercise-select");
const searchTeacherBtn = document.getElementById("search-teacher-btn");
const matchResults = document.getElementById("match-results");

// --- 「教えたい」人を検索する ---
searchTeacherBtn.addEventListener("click", async () => {
  if (!currentUser) return;

  const exercise = searchExerciseSelect.value;
  matchResults.innerHTML = "検索中...";

  try {
    const q = query(
      collectionGroup(db, "skills"),
      where("exercise", "==", exercise),
      where("can_teach", "==", true)
    );

    const snapshot = await getDocs(q);
    matchResults.innerHTML = "";

    if (snapshot.empty) {
      matchResults.innerHTML = "<li>該当する人が見つかりませんでした</li>";
      return;
    }

    for (const docSnap of snapshot.docs) {
      const skill = docSnap.data();
      const teacherUid = docSnap.ref.parent.parent.id; // skillsの親(users/{uid})のIDを取得

      if (teacherUid === currentUser.uid) continue; // 自分自身は除外

      // 相手のメールアドレスを取得
      const userDocSnap = await getDocs(
        query(collection(db, "users"), where("__name__", "==", teacherUid))
      );
      let teacherEmail = "不明";
      userDocSnap.forEach((d) => {
        teacherEmail = d.data().email;
      });

      const li = document.createElement("li");
      li.classList.add("tag-teach");
      
      const info = document.createElement("span");
      info.className = "skill-info";
      
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "教えたい";
      
      info.textContent = `${maskEmail(teacherEmail)} さん（${skill.exercise} / ${skill.level}） `;
      info.appendChild(badge);
      
      const requestBtn = document.createElement("button");
      requestBtn.textContent = "マッチ申請を送る";
      requestBtn.addEventListener("click", async () => {
        await addDoc(collection(db, "matches"), {
          teacher_uid: teacherUid,
          teacher_email: teacherEmail,
          learner_uid: currentUser.uid,
          learner_email: currentUser.email,
          exercise: exercise,
          status: "pending",
          created_at: new Date()
        });
        alert("マッチ申請を送りました！");
      });
      
      li.appendChild(info);
      li.appendChild(requestBtn);
      matchResults.appendChild(li);
    }
  } catch (error) {
    console.error("検索エラー:", error);
    matchResults.innerHTML = "検索中にエラーが発生しました: " + error.message;
  }
});

// --- DOM要素の取得(申請一覧関連) ---
const incomingRequestsList = document.getElementById("incoming-requests");
const outgoingRequestsList = document.getElementById("outgoing-requests");

let unsubscribeIncoming = null;
let unsubscribeOutgoing = null;

// --- 自分宛てに届いた申請をリアルタイムで監視 ---
function watchIncomingRequests(uid) {
  const q = query(
    collection(db, "matches"),
    where("teacher_uid", "==", uid)
  );

  unsubscribeIncoming = onSnapshot(q, (snapshot) => {
    incomingRequestsList.innerHTML = "";

    if (snapshot.empty) {
      incomingRequestsList.innerHTML = "<li>届いている申請はありません</li>";
      return;
    }

    snapshot.forEach((docSnap) => {
      const match = docSnap.data();
      const li = document.createElement("li");

      const statusLabel =
        match.status === "pending" ? "承認待ち" :
        match.status === "approved" ? "承認済み" : "却下済み";

      li.textContent = `${maskEmail(match.learner_email)} さんから「${match.exercise}」を教えてほしいと申請 (${statusLabel}) `;

      if (match.status === "pending") {
        const approveBtn = document.createElement("button");
        approveBtn.textContent = "承認する";
        approveBtn.addEventListener("click", async () => {
          await updateDoc(doc(db, "matches", docSnap.id), { status: "approved" });
        });

        const rejectBtn = document.createElement("button");
        rejectBtn.textContent = "断る";
        rejectBtn.addEventListener("click", async () => {
          await updateDoc(doc(db, "matches", docSnap.id), { status: "rejected" });
        });

        li.appendChild(approveBtn);
        li.appendChild(rejectBtn);
      }

      if (match.status === "approved") {
        const chatBtn = document.createElement("button");
        chatBtn.textContent = "チャットを開く";
        chatBtn.addEventListener("click", () => {
          openChat(docSnap.id, maskEmail(match.learner_email));
        });
        li.appendChild(chatBtn);
      }

      incomingRequestsList.appendChild(li);
    });
  });
}

// --- 自分が送った申請をリアルタイムで監視 ---
function watchOutgoingRequests(uid) {
  const q = query(
    collection(db, "matches"),
    where("learner_uid", "==", uid)
  );

  unsubscribeOutgoing = onSnapshot(q, (snapshot) => {
    outgoingRequestsList.innerHTML = "";

    if (snapshot.empty) {
      outgoingRequestsList.innerHTML = "<li>送った申請はありません</li>";
      return;
    }

    snapshot.forEach((docSnap) => {
      const match = docSnap.data();
      const li = document.createElement("li");

      const statusLabel =
        match.status === "pending" ? "承認待ち" :
        match.status === "approved" ? "承認済み🎉" : "却下されました";

      li.textContent = `${maskEmail(match.teacher_email)} さんに「${match.exercise}」を申請中 (${statusLabel})`;

      if (match.status === "approved") {
        const chatBtn = document.createElement("button");
        chatBtn.textContent = "チャットを開く";
        chatBtn.addEventListener("click", () => {
          openChat(docSnap.id, maskEmail(match.teacher_email));
        });
        li.appendChild(chatBtn);
      }

      outgoingRequestsList.appendChild(li);
    });
  });
}

// --- DOM要素の取得(チャット関連) ---
const chatSection = document.getElementById("chat-section");
const chatPartnerLabel = document.getElementById("chat-partner-label");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send-btn");

let currentChatMatchId = null;
let unsubscribeChat = null;

// --- チャットを開く ---
function openChat(matchId, partnerEmail) {
  currentChatMatchId = matchId;
  chatPartnerLabel.textContent = partnerEmail;
  chatSection.style.display = "block";
  chatSection.scrollIntoView({ behavior: "smooth" });

  if (unsubscribeChat) {
    unsubscribeChat();
  }

  const q = query(
    collection(db, "matches", matchId, "messages"),
    orderBy("created_at", "asc")
  );

  unsubscribeChat = onSnapshot(q, (snapshot) => {
    chatMessages.innerHTML = "";
    let lastSender = null;

    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const isMine = msg.sender_uid === currentUser.uid;

      const li = document.createElement("li");
      li.classList.add(isMine ? "chat-mine" : "chat-theirs");

      // 直前のメッセージと送信者が違うときだけ名前を表示する
      if (msg.sender_uid !== lastSender) {
        const nameTag = document.createElement("span");
        nameTag.className = "chat-sender";
        nameTag.textContent = isMine ? "自分" : partnerEmail;
        li.appendChild(nameTag);
      }

      const textEl = document.createElement("span");
      textEl.className = "chat-text";
      textEl.textContent = msg.text;
      li.appendChild(textEl);

      if (isMine) {
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "削除";
        deleteBtn.className = "chat-delete-btn";
        deleteBtn.addEventListener("click", async () => {
          if (confirm("このメッセージを削除しますか？")) {
            await deleteDoc(doc(db, "matches", currentChatMatchId, "messages", docSnap.id));
          }
        });
        li.appendChild(deleteBtn);
      }

      chatMessages.appendChild(li);
      lastSender = msg.sender_uid;
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// --- メッセージ送信 ---
chatSendBtn.addEventListener("click", async () => {
  const text = chatInput.value.trim();
  if (!text || !currentChatMatchId || !currentUser) return;

  await addDoc(collection(db, "matches", currentChatMatchId, "messages"), {
    sender_uid: currentUser.uid,
    text: text,
    created_at: new Date()
  });

  chatInput.value = "";
});

// Enterキーでも送信できるようにする
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    chatSendBtn.click();
  }
});

function maskEmail(email) {
  const [name, domain] = email.split("@");
  return name.slice(0, 2) + "***@" + domain;
}

// --- エラーメッセージの日本語化 ---
function translateAuthError(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "このメールアドレスは既に登録されています";
    case "auth/invalid-email":
      return "メールアドレスの形式が正しくありません";
    case "auth/weak-password":
      return "パスワードは6文字以上にしてください";
    case "auth/invalid-credential":
      return "メールアドレスまたはパスワードが間違っています";
    default:
      return "エラーが発生しました: " + code;
  }
}


export { app, auth, db };
