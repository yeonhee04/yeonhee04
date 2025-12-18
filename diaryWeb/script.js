function init() {
  // --------------------- [1] 주요 변수, 데이터 구조 초기화 ----------------------

  // 마지막에 선택한 감정 기억(저장된 값이 없으면 'happy'로 시작)
  var currentEmotion = localStorage.getItem('lastEmotion') || 'happy';

  // 감정별 추천 음악 목록(각 감정마다 3곡씩)
  var emotionMusicList = {
    happy: [
      { title: "Show Me Love", artist: "RIIZE", url: "https://youtu.be/b5vM6MfXhVA" },
      { title: "빨간 맛", artist: "Red Velvet", url: "https://youtu.be/WyiIGEHQP8o" },
      { title: "View", artist: "SHINee", url: "https://youtu.be/UF53cptEE5k" }
    ],
    calm: [
      { title: "드라마", artist: "아이유", url: "https://youtu.be/AkugjXUj5sM" },
      { title: "숲", artist: "최유리", url: "https://youtu.be/7ihLv8_Vd-4" },
      { title: "주저하는 연인들을 위해", artist: "잔나비", url: "https://youtu.be/t8P-zdkoeJA" }
    ],
    sad: [
      { title: "한숨", artist: "이하이", url: "https://youtu.be/JsaW-lHELYo" },
      { title: "도망가자", artist: "선우정아", url: "https://youtu.be/0q6DR6EiPPo" },
      { title: "나의 사춘기에게", artist: "볼빨간사춘기", url: "https://youtu.be/0tkgGcnRNTE" }
    ],
    angry: [
      { title: "품행제로", artist: "블락비 바스타즈", url: "https://youtu.be/L2Gsg9NVGVo" },
      { title: "붐바야", artist: "BLACKPINK", url: "https://youtu.be/bwmSjveL3Lc" },
      { title: "Okey Dokey", artist: "MINO, 지코", url: "https://youtu.be/CJnKrgTdKZY" }
    ]
  };

  // localStorage에서 일기와 사용자 음악 데이터 불러오기(없으면 빈 배열)
  var entries   = JSON.parse(localStorage.getItem('entries') || '[]');
  var userMusic = JSON.parse(localStorage.getItem('userMusic') || '[]');

  // 주요 HTML 요소 변수화(빠른 접근용)
  var body               = document.body;
  var emotionButtons     = document.querySelectorAll('.emotion-btn');       // 감정 버튼들
  var musicListEl        = document.getElementById('music-list');           // 음악 카드 리스트
  var entryDateEl        = document.getElementById('entry-date');           // 일기 날짜 입력란
  var entryEmotionEl     = document.getElementById('entry-emotion');        // 일기 감정 태그
  var entryForm          = document.getElementById('entry-form');           // 일기 작성 폼
  var entryNoteEl        = document.getElementById('entry-note');           // 일기 메모 입력란
  var musicForm          = document.getElementById('music-form');           // 사용자 음악 등록 폼
  var userMusicListEl    = document.getElementById('user-music-list');      // 등록 음악 리스트
  var calendarEl         = document.getElementById('calendar');             // 달력(캘린더)
  var calendarEntryEl    = document.getElementById('calendar-entry');       // 달력 상세 일기 보기
  var currentMonthYearEl = document.getElementById('current-month-year');   // 달력 상단 년/월 표기
  var statsChartEl       = document.getElementById('stats-chart');          // 감정별 통계 차트 영역
  var encouragementEl    = document.getElementById('encouragement');        // 감정별 위로 문구

  // 오늘 날짜를 'YYYY-MM-DD' 형태 문자열로 저장(최초 일기 작성 시 기본값)
  var selectedDate = (function() {
    var dt = new Date();
    return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
  })();
    
  // 달력 이동(이전/다음달)용 현재 표시 연/월
  var displayedYear = new Date().getFullYear();   // 달력에 표시되는 연도
  var displayedMonth = new Date().getMonth();     // 달력에 표시되는 월(0~11)

  // 감정별 격려 문구 텍스트
  var messages = {
    happy: "오늘은 멋진 하루가 될 거예요! 😊",
    calm: "조용하고 평화로운 하루를 즐겨보세요.",
    sad: "가끔은 슬픈 날도 있어요. 내일은 더 나을 거예요. 🌱",
    angry: "화난 감정도 소중합니다. 잠시 숨을 고르세요."
  };

  // ---------- [2] 초기 화면 렌더링(페이지가 열릴 때 한 번 실행) ----------

  // 테마(배경색 등), 감정 버튼, 음악, 달력, 통계, 폼 등 초기화
  applyTheme(currentEmotion);                   // body 감정별 배경 테마 적용
  updateEmotionSelectionUI(currentEmotion);     // 감정 버튼 강조(활성)
  renderMusicRecommendations();                 // 감정에 맞는 음악 카드 리스트
  renderUserMusicList();                        // 사용자 등록 음악 리스트
  renderCalendar();                             // 달력(캘린더) 전체 그리기
  renderStatsChart();                           // 감정별 일기 통계 차트
  updateEntryFormDateEmotion();                 // 일기 작성 폼에 날짜/감정 표시
  showEncouragement(currentEmotion);            // 감정별 격려 문구

  // ------------------- [3] 사용자 행동에 대한 이벤트 등록 ------------------

  // 1. 감정 버튼 클릭시: 선택 감정 갱신 및 관련 UI(음악, 폼, 테마 등) 전부 갱신
  emotionButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      currentEmotion = btn.dataset.emotion;
      localStorage.setItem('lastEmotion', currentEmotion); // 감정 기억
      applyTheme(currentEmotion);                          // 배경 테마 변경
      updateEmotionSelectionUI(currentEmotion);            // 버튼 스타일
      renderMusicRecommendations();                        // 음악 카드 갱신
      updateEntryFormDateEmotion();                        // 일기폼 감정 태그 갱신
      showEncouragement(currentEmotion);                   // 격려문구 표시
    });
  });

  // 2. 일기 작성 폼 제출 시: 입력값 저장 및 달력/통계 갱신
  entryForm.addEventListener('submit', function(e) {
    e.preventDefault();                          // 폼 전송시 새로고침 방지
    var note = entryNoteEl.value.trim();
    var date = entryDateEl.value;
    if (!note || !date) return;                  // 입력값 없으면 저장X
    entries.push({ date: date, emotion: currentEmotion, note: note }); // 일기 추가
    localStorage.setItem('entries', JSON.stringify(entries)); // 저장
    entryNoteEl.value = '';                      // 메모 입력란 초기화
    renderCalendar();                            // 달력 새로 그림
    renderStatsChart();                          // 통계 차트 갱신
    calendarEntryEl.innerHTML = '';              // 상세 일기 영역 초기화
  });

  // 3. 사용자 음악 추가 폼 제출 시: 입력값 저장 및 음악 리스트/추천 갱신
  musicForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var title  = document.getElementById('music-title').value.trim();
    var artist = document.getElementById('music-artist').value.trim();
    var url    = document.getElementById('music-url').value.trim();
    if (!title || !artist || !url) return;         // 하나라도 빠지면 저장X
    userMusic.push({ title: title, artist: artist, url: url, emotion: currentEmotion }); // 곡 추가
    localStorage.setItem('userMusic', JSON.stringify(userMusic)); // 저장
    musicForm.reset();                             // 입력란 초기화
    renderUserMusicList();                         // 리스트 갱신
    renderMusicRecommendations();                  // 추천 카드 갱신
  });

  // 4. 일기 작성 날짜 입력란의 값이 바뀔 때마다 selectedDate 갱신
  entryDateEl.addEventListener('change', function() {
    selectedDate = entryDateEl.value;
    updateEntryFormDateEmotion();
  });

  // ------------------ [4] 주요 렌더링 함수(화면 그리기) --------------------

  // (1) body에 감정별 테마색(클래스) 적용
  function applyTheme(emotion) {
    body.className = '';
    body.classList.add('theme-' + emotion); // .theme-happy, .theme-calm 등
  }

  // (2) 감정 버튼 중 선택 감정에만 'active' 클래스 부여(강조)
  function updateEmotionSelectionUI(emotion) {
    emotionButtons.forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.emotion === emotion);
    });
  }

  // (3) 음악 추천 카드 리스트 그리기(감정별 추천 + 사용자가 등록한 곡)
  function renderMusicRecommendations() {
    musicListEl.innerHTML = '';
    // 사용자가 등록한 음악(해당 감정만, 최신순)
    userMusic.filter(function(m) { return m.emotion === currentEmotion; })
      .slice().reverse().forEach(function(m) {
        musicListEl.appendChild(createMusicCard(m, true));
      });
    // 기본 추천 음악(감정별)
    emotionMusicList[currentEmotion].forEach(function(m) {
      musicListEl.appendChild(createMusicCard(m, false));
    });
  }

  // (4) 음악 카드 1개 생성(곡명, 아티스트, 직접등록 표기, 듣기버튼)
  function createMusicCard(music, isUser) {
    var div = document.createElement('div');
    div.className = 'card';
    div.innerHTML =
      '<div class="info"><strong>' + music.title + '</strong>' +
      '<span>' + music.artist + (isUser ? ' (Yours)' : '') + '</span></div>' +
      '<button class="play-btn" data-url="' + music.url + '">듣기</button>';
    // 듣기 버튼 클릭 시 해당 곡의 유튜브 링크 새 창으로 열기
    div.querySelector('.play-btn').addEventListener('click', function() {
      window.open(music.url, '_blank');
    });
    return div;
  }

  // (5) 일기 작성 폼 날짜와 감정 태그 갱신
  function updateEntryFormDateEmotion() {
    entryDateEl.value = selectedDate;
    // 미래 날짜 입력 못 하게 제한
    var todayObj = new Date();
    var todayStr = todayObj.getFullYear() + '-' + String(todayObj.getMonth()+1).padStart(2,'0') + '-' + String(todayObj.getDate()).padStart(2,'0');
    entryDateEl.max = todayStr;
    // 감정 태그(텍스트, 색상) 업데이트
    entryEmotionEl.textContent = currentEmotion.charAt(0).toUpperCase() + currentEmotion.slice(1);
    entryEmotionEl.className   = 'tag tag-' + currentEmotion;
  }

  // (6) 사용자 등록 음악 리스트(삭제 가능 버튼 포함) 렌더링
  function renderUserMusicList() {
    userMusicListEl.innerHTML = '';
    userMusic.forEach(function(m, i) {
      var li = document.createElement('li');
      li.innerHTML = m.title + ' - ' + m.artist + ' <button data-index="' + i + '">❌</button>';
      // X버튼 클릭 시 해당 곡 삭제, 리스트/추천 갱신
      li.querySelector('button').addEventListener('click', function() {
        userMusic.splice(i,1);
        localStorage.setItem('userMusic', JSON.stringify(userMusic));
        renderUserMusicList();
        renderMusicRecommendations();
      });
      userMusicListEl.appendChild(li);
    });
  }

  // (7) 달력 렌더링 - 전체 월 지원
  function renderCalendar() {
    var year = displayedYear;
    var month = displayedMonth;
    // [상단] 이전/다음달 이동 버튼 및 년월 표기
    var navHtml =
      '<button id="prev-month" style="margin-right:8px;">◀</button>' +
      '<span class="month-label">' + year + '년 ' + String(month+1).padStart(2,'0') + '월</span>' +
      '<button id="next-month" style="margin-left:8px;">▶</button>';
    currentMonthYearEl.innerHTML = navHtml;
    // 달력 테이블 구성 시작
    var firstDay = new Date(year, month, 1).getDay();        // 1일 요일
    var lastDate = new Date(year, month+1, 0).getDate();     // 마지막 날짜
    var html = '<table>';
    html += '<thead><tr>';
    var weekNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    for (var w=0; w<7; w++) html += '<th>' + weekNames[w] + '</th>';
    html += '</tr></thead><tbody><tr>';
    // 첫째 주 빈 칸
    for (var i=0; i<firstDay; i++) html += '<td></td>';
    // 날짜 칸(1~마지막날)
    for (var d=1; d<=lastDate; d++) {
      if ((firstDay + d - 1) % 7 === 0 && d !== 1) html += '</tr><tr>';
      var dateStr = year+'-'+String(month+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
      var entry = entries.find(function(e){ return e.date===dateStr; });
      var calClass = entry ? ' class="cal-' + entry.emotion + '"' : '';
      html += '<td' + calClass + ' data-date="' + dateStr + '">' + d + '</td>';
    }
    html += '</tr></tbody></table>';
    calendarEl.innerHTML = html;
    // 각 날짜 셀 클릭시 일기 상세 표시(이벤트 연결)
    var cells = calendarEl.querySelectorAll('td[data-date]');
    cells.forEach(function(cell) {
      cell.addEventListener('click', function() {
        showCalendarEntry(this.dataset.date);
      });
    });
    // 이전/다음달 버튼에 클릭 이벤트 연결
    var prevBtn = document.getElementById('prev-month');
    var nextBtn = document.getElementById('next-month');
    prevBtn.addEventListener('click', function() {
      if (displayedMonth === 0) { displayedYear--; displayedMonth = 11; }
      else { displayedMonth--; }
      renderCalendar();
    });
    nextBtn.addEventListener('click', function() {
      if (displayedMonth === 11) { displayedYear++; displayedMonth = 0; }
      else { displayedMonth++; }
      renderCalendar();
    });
  }

  // (8) 달력 날짜 클릭시 상세 일기 보기, 일기 작성 날짜 자동 변경
  function showCalendarEntry(ds) {
    selectedDate = ds;  // 선택 날짜 갱신
    updateEntryFormDateEmotion();
    var entry = entries.find(function(e){return e.date===ds;});
    if(entry) {
      calendarEntryEl.innerHTML = '<h3>'+ds+'</h3>' +
        '<p>감정: '+entry.emotion+'</p>' +
        '<p>메모: '+entry.note+'</p>';
    } else {
      calendarEntryEl.innerHTML = '<p>해당 날짜에 작성된 일기가 없습니다.</p>';
    }
  }

  // (9) 감정별 일기 개수를 파이차트로 표시(Plotly.js 활용)
  function renderStatsChart() {
    statsChartEl.innerHTML = ''; // 이전 안내문/차트 제거
    var counts = {};             // 감정별 개수 집계
    entries.forEach(function(e){
      counts[e.emotion] = (counts[e.emotion]||0)+1;
    });
    var labels = Object.keys(counts);   // 감정 목록 배열
    var values = labels.map(function(k){ return counts[k]; });  // 감정별 일기 개수
    if(labels.length===0) {
      statsChartEl.innerHTML = '<p>일기가 없습니다.</p>';
      return;
    }
    var data = [{   // Plotly 파이차트 데이터
      values: values,
      labels: labels,
      type: 'pie',
      marker: { colors: labels.map(getColorForEmotion) }
    }];
    Plotly.newPlot(statsChartEl, data, { height:300, width:300, margin:{t:20,b:20,l:20,r:20} }, { displayModeBar:false });  // 차트 생성
  }

  // (10) 감정별로 차트/달력에 색상 반환
  function getColorForEmotion(e) {
    var map = { happy:'#FFD166', calm:'#06D6A0', sad:'#118AB2', angry:'#EF476F' };
    return map[e] || '#888';
  }

  // (11) 감정별 격려문구 표시
  function showEncouragement(emotion) {
    if(encouragementEl) encouragementEl.textContent = messages[emotion] || '';
  }
}
