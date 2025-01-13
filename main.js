import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteField
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const passwordScreen = document.getElementById("password-screen");
const mainScreen = document.getElementById("main-screen");
const passwordInput = document.getElementById("password-input");
const joinGroupBtn = document.getElementById("join-group-btn");

const participantNameInput = document.getElementById("participant-name-input");
const addParticipantBtn = document.getElementById("add-participant-btn");
const participantsList = document.getElementById("participants-list");

const noteDateInput = document.getElementById("note-date-input");
const prayerNoteInput = document.getElementById("prayer-note-input");
const participantSelect = document.getElementById("participant-select");
const addNoteBtn = document.getElementById("add-note-btn");

const filterDateInput = document.getElementById("filter-date-input");
const filterParticipantSelect = document.getElementById("filter-participant-select");
const applyFilterBtn = document.getElementById("apply-filter-btn");
const notesDisplay = document.getElementById("notes-display");

const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

let groupPassword = "";

// ** 비밀번호로 그룹 입장 **
joinGroupBtn.addEventListener("click", async () => {
  groupPassword = passwordInput.value.trim();
  if (!groupPassword) return alert("비밀번호를 입력하세요!");

  const groupRef = doc(db, "groups", groupPassword);
  const groupSnapshot = await getDoc(groupRef);

  if (!groupSnapshot.exists()) {
    await setDoc(groupRef, { participants: [], notes: {} });
    alert("새 모임이 생성되었습니다!");
  }

  passwordScreen.classList.add("hidden");
  mainScreen.classList.remove("hidden");
  loadParticipants();
});

// ** 참여자 추가 **
addParticipantBtn.addEventListener("click", async () => {
  const name = participantNameInput.value.trim();
  if (!name) return alert("참여자 이름을 입력하세요!");

  const groupRef = doc(db, "groups", groupPassword);
  await updateDoc(groupRef, {
    participants: arrayUnion(name),
  });

  participantNameInput.value = "";
  loadParticipants();
  showSuccessMessage("참여자가 추가되었습니다!");
});

// ** 참여자 불러오기 및 삭제 기능 **
async function loadParticipants() {
  const groupRef = doc(db, "groups", groupPassword);
  const groupSnapshot = await getDoc(groupRef);
  const data = groupSnapshot.data();

  participantsList.innerHTML = data.participants.map((name, index) => `
      <li>
          ${index + 1}. ${name}
          <button class="delete-btn" data-name="${name}">삭제</button>
      </li>
  `).join("");

  participantSelect.innerHTML = data.participants.map(name => `
      <option value="${name}">${name}</option>
  `).join("");

  filterParticipantSelect.innerHTML = `
      <option value="">전체 참여자</option>
      ${data.participants.map(name => `<option value="${name}">${name}</option>`).join("")}
  `;

  document.querySelectorAll(".delete-btn").forEach(button => {
    button.addEventListener("click", async (e) => {
      const nameToDelete = e.target.dataset.name;
      await deleteParticipant(nameToDelete); // 참여자 삭제 함수 호출
      loadParticipants(); // 업데이트된 목록 로드
    });
  });

  loadAvailableDates();
}

// ** 참여자 삭제 및 기도제목 삭제 **
async function deleteParticipant(nameToDelete) {
  // 삭제 확인 메시지
  const isConfirmed = confirm(`정말로 ${nameToDelete} 참여자를 삭제하시겠습니까?`);

  if (!isConfirmed) return; // 사용자가 "취소"를 누르면 삭제하지 않음

  const groupRef = doc(db, "groups", groupPassword);

  // 참여자 목록에서 해당 이름 삭제
  await updateDoc(groupRef, {
    participants: arrayRemove(nameToDelete),
  });

  // 기도제목 데이터에서 해당 참여자 삭제
  const groupSnapshot = await getDoc(groupRef);
  const data = groupSnapshot.data();

  // 모든 날짜에 대해 해당 참여자의 기도제목을 삭제
  for (const date in data.notes) {
    if (data.notes[date][nameToDelete]) {
      await updateDoc(groupRef, {
        [`notes.${date}.${nameToDelete}`]: deleteField()
      });

      // Firebase 작업이 완료된 후 날짜가 비어 있으면 해당 날짜 삭제
      const groupSnapshot = await getDoc(groupRef);
      const data = groupSnapshot.data();
      const updatedNotes = { ...data.notes };

      if (Object.keys(updatedNotes[date] || {}).length === 0) {
        // 해당 날짜의 기도 제목이 모두 삭제되었으면 날짜를 삭제
        delete updatedNotes[date];

        // notes에서 날짜 삭제 업데이트
        await updateDoc(groupRef, { notes: updatedNotes });
      }
    }
  }

  // 삭제 후 참여자 목록 다시 로드
  loadParticipants();
  loadAvailableDates();
}

// ** 기도 제목 추가 및 수정/삭제 기능 **
addNoteBtn.addEventListener("click", async () => {
  const date = noteDateInput.value;
  const note = prayerNoteInput.value.trim();
  const participant = participantSelect.value;

  if (!date || !note || !participant) return alert("모든 필드를 입력하세요!");

  const groupRef = doc(db, "groups", groupPassword);
  const groupSnapshot = await getDoc(groupRef);
  const data = groupSnapshot.data();

  const formattedNote = formatTextWithLineBreaks(note);

  const updatedNotes = { ...data.notes };
  if (!updatedNotes[date]) updatedNotes[date] = {};
  updatedNotes[date][participant] = formattedNote;

  await updateDoc(groupRef, { notes: updatedNotes });

  prayerNoteInput.value = "";

  // 2초 동안 '기도 제목 저장 완료' 메시지 표시
  const successMessage = document.createElement("div");
  successMessage.className = "success-message";
  successMessage.textContent = "기도 제목이 성공적으로 저장되었습니다!";
  document.body.appendChild(successMessage);

  // 2초 후 메시지 자동 삭제
  setTimeout(() => {
    successMessage.remove();
  }, 2000);

  loadNotesForDate(date, participant); // 새로 추가된 기도 제목 로드
  loadAvailableDates(); // 날짜 필터 갱신 (새로운 날짜 추가 반영)
});

// ** 날짜별로 기도 제목 조회 **
applyFilterBtn.addEventListener("click", async () => {
  const selectedDate = filterDateInput.value;
  const selectedParticipant = filterParticipantSelect.value;

  if (selectedDate) {
    loadNotesForDate(selectedDate, selectedParticipant);
  }
});

async function loadAvailableDates() {
  const groupRef = doc(db, "groups", groupPassword);
  const groupSnapshot = await getDoc(groupRef);
  const data = groupSnapshot.data();

  const dates = Object.keys(data.notes);
  filterDateInput.innerHTML = dates.map(date => `<option value="${date}">${date}</option>`).join("");
}

// ** 날짜별로 기도 제목 불러오기 **
async function loadNotesForDate(date, participant) {
  const groupRef = doc(db, "groups", groupPassword);
  const groupSnapshot = await getDoc(groupRef);
  const data = groupSnapshot.data();

  const notesForDate = data.notes[date] || {};

  notesDisplay.innerHTML = Object.entries(notesForDate).map(([name, note]) => `
    <div class="note-item" data-name="${name}">
      <p><strong>${name}</strong><br/> <span class="note-text">${note}</span></p>
      ${participant && participant === name ? `
        <button class="edit-note-btn">수정</button>
        <button class="delete-note-btn">삭제</button>
        <textarea class="edit-note-input" placeholder="${note}" style="display: none;"></textarea>
        <button class="save-note-btn" style="display: none;">저장</button>
      ` : ''}
    </div>
  `).join("");

  // ** 기도제목 수정 **
  document.querySelectorAll(".edit-note-btn").forEach(button => {
    button.addEventListener("click", (e) => {
      const noteItem = e.target.closest('.note-item');
      const inputField = noteItem.querySelector('.edit-note-input');
      const saveBtn = noteItem.querySelector('.save-note-btn');
      const noteText = noteItem.querySelector('.note-text');
      const originalText = noteText.innerHTML;

      // input 필드를 textarea로 변경하고 기존 기도 제목을 표시
      inputField.style.display = 'block';
      inputField.value = originalText.replace(/<br\s*\/?>/gi, '\n');
      saveBtn.style.display = 'inline-block';

      // 저장 버튼 클릭 시 수정 내용 저장
      saveBtn.addEventListener("click", async () => {
        const newNote = inputField.value.trim();
        if (newNote && newNote !== originalText) {
          const name = noteItem.dataset.name;
          const formattednewNote = formatTextWithLineBreaks(newNote);
          await updateNoteForDate(date, name, formattednewNote);
          noteText.textContent = newNote; // 화면에서 바로 변경된 내용 반영
          inputField.style.display = 'none'; // textarea 숨기기
          saveBtn.style.display = 'none'; // 저장 버튼 숨기기
        }
      });
    });
  });

  // ** 기도제목 삭제 **
  document.querySelectorAll(".delete-note-btn").forEach(button => {
    button.addEventListener("click", async (e) => {
      const name = e.target.closest('.note-item').dataset.name;
      await deleteNoteForDate(date, name);

      // Firebase 작업이 완료된 후 날짜가 비어 있으면 해당 날짜 삭제
      const groupSnapshot = await getDoc(groupRef);
      const data = groupSnapshot.data();
      const updatedNotes = { ...data.notes };

      if (Object.keys(updatedNotes[date] || {}).length === 0) {
        // 해당 날짜의 기도 제목이 모두 삭제되었으면 날짜를 삭제
        delete updatedNotes[date];

        // notes에서 날짜 삭제 업데이트
        await updateDoc(groupRef, { notes: updatedNotes });
      }
    });
    loadParticipants();
    loadAvailableDates();
  });
}

// ** 기도 제목 수정 함수 **
async function updateNoteForDate(date, name, newNote) {
  const groupRef = doc(db, "groups", groupPassword);
  const groupSnapshot = await getDoc(groupRef);
  const data = groupSnapshot.data();

  const updatedNotes = { ...data.notes };
  if (!updatedNotes[date]) updatedNotes[date] = {};
  const formattedNewNote = formatTextWithLineBreaks(newNote);
  updatedNotes[date][name] = formattedNewNote;

  await updateDoc(groupRef, { notes: updatedNotes });
  loadNotesForDate(date, name); // 새로 추가된 기도 제목 로드
}

// ** 기도제목 삭제 **
async function deleteNoteForDate(date, name) {
  const groupRef = doc(db, "groups", groupPassword);
  const groupSnapshot = await getDoc(groupRef);
  const data = groupSnapshot.data();

  const updatedNotes = { ...data.notes };
  if (updatedNotes[date]) {
    delete updatedNotes[date][name];
  }

  await updateDoc(groupRef, { notes: updatedNotes });

  // 기도제목 삭제 후 해당 날짜와 참여자의 기도제목을 새로 불러오기
  loadNotesForDate(date, name);
}

// ** 성공 메시지 표시 **
function showSuccessMessage(message) {
  const successMessage = document.createElement("div");
  successMessage.textContent = message;
  successMessage.classList.add("success-message");
  document.body.appendChild(successMessage);

  // 잠시 후 알림 숨기기
  setTimeout(() => {
    successMessage.remove();
  }, 2000);
}

// ** 탭 전환 기능 **
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    tabContents.forEach(content => content.classList.remove("active"));
    document.getElementById(`${tab.id.replace('-tab', '-section')}`).classList.add("active");
  });
});

// 기도 제목을 textarea에서 가져온 후 줄바꿈을 <br>로 변환하여 표시
function formatTextWithLineBreaks(text) {
  return text.replace(/\n/g, '<br>'); // 줄바꿈 문자를 <br>로 변환
}