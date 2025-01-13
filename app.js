document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('login-section');
  const appSection = document.getElementById('app-section');
  const passwordInput = document.getElementById('password-input');
  const loginBtn = document.getElementById('login-btn');

  const participantsList = document.getElementById('participants-list');
  const notesSection = document.getElementById('notes-section');
  const notesList = document.getElementById('notes-list');
  const prayerNote = document.getElementById('prayer-note');
  const saveNote = document.getElementById('save-note');

  let currentGroup = '';
  let currentDate = '';

  // 비밀번호 확인
  loginBtn.addEventListener('click', () => {
    const password = passwordInput.value;
    if (password === 'YOUR_GROUP_PASSWORD') {
      currentGroup = password;
      loginSection.classList.add('hidden');
      appSection.classList.remove('hidden');
    } else {
      alert('비밀번호가 잘못되었습니다.');
    }
  });

  // 참여자 추가
  document.getElementById('add-participant').addEventListener('click', async () => {
    const name = document.getElementById('participant-name').value;
    if (name) {
      await db.collection('groups').doc(currentGroup).collection('participants').doc(name).set({});
      alert('참여자가 추가되었습니다.');
      document.getElementById('participant-name').value = '';
    }
  });

  // 참여자 목록 보기
  document.getElementById('view-participants').addEventListener('click', async () => {
    const snapshot = await db.collection('groups').doc(currentGroup).collection('participants').get();
    participantsList.innerHTML = '';
    snapshot.forEach(doc => {
      const li = document.createElement('li');
      li.textContent = doc.id;
      participantsList.appendChild(li);
    });
  });

  // 날짜별 기도제목 보기
  document.getElementById('view-notes').addEventListener('click', async () => {
    currentDate = document.getElementById('date-input').value;
    if (!currentDate) return alert('날짜를 선택해주세요.');
    const snapshot = await db.collection('groups').doc(currentGroup).collection('notes').doc(currentDate).get();
    notesList.innerHTML = '';
    if (snapshot.exists) {
      const data = snapshot.data();
      for (const [participant, note] of Object.entries(data)) {
        const li = document.createElement('li');
        li.textContent = `${participant}: ${note}`;
        notesList.appendChild(li);
      }
    }
    notesSection.classList.remove('hidden');
  });

  // 기도제목 저장
  saveNote.addEventListener('click', async () => {
    const participant = prompt('참여자 이름을 입력하세요:');
    const note = prayerNote.value;
    if (participant && note) {
      const docRef = db.collection('groups').doc(currentGroup).collection('notes').doc(currentDate);
      const docSnapshot = await docRef.get();
      const data = docSnapshot.exists ? docSnapshot.data() : {};
      data[participant] = note;
      await docRef.set(data);
      alert('기도제목이 저장되었습니다.');
      prayerNote.value = '';
    }
  });
});