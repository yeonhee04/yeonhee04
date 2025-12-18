# 🎵 TuneMyMood: 감성 기반 음악 추천 & 다이어리

> "오늘의 기분에 맞춰 색감과 음악이 변하는, 나만의 감성 기록 공간"

사용자의 감정 상태(행복, 차분, 우울, 분노 등)를 선택하면 웹사이트의 테마 색상과 추천 음악이 실시간으로 변경되는 반응형 웹 다이어리입니다. 별도의 서버 없이 브라우저 저장소를 활용하여 일기 기록과 통계 기능을 구현했습니다.

## Tech Stack
<img src="https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white"/> <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white"/> <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black"/> <img src="https://img.shields.io/badge/Plotly.js-3F4F75?style=flat&logo=plotly&logoColor=white"/>

## Key Features
* 감정 반응형 UI: 4가지 감정 이모지 선택 시, 배경색/버튼/강조색 등 전체 테마가 즉시 변경되어 감정에 몰입할 수 있는 환경을 제공합니다.
* 음악 추천 및 플레이어: 감정에 어울리는 추천 음악(Youtube)을 제공하며, `window.open`을 활용해 끊김 없는 감상을 지원합니다.
* 커스텀 플레이리스트: 사용자가 좋아하는 음악(URL)을 직접 등록하고 삭제할 수 있는 CRUD 기능을 구현했습니다.
* 캘린더 & 일기 관리: 달력 UI를 통해 날짜별 일기를 작성하고, 직관적인 색상 태그로 한 달의 감정 흐름을 파악할 수 있습니다.
* 감정 통계 차트: `Plotly.js`를 활용하여 이번 달에 가장 많이 느낀 감정을 파이 차트로 시각화했습니다.

## Troubleshooting & Learnings
* 서버 없는 데이터 영구 저장 (LocalStorage):
    백엔드 서버 없이 사용자의 일기 데이터와 커스텀 음악 리스트를 유지하기 위해 `localStorage`를 적극 활용했습니다. 새로고침 후에도 데이터가 유실되지 않도록 구현하며 웹 스토리지의 동작 원리를 이해했습니다.
* UX를 고려한 음악 재생:
    일기를 쓰는 도중 페이지가 이동되면 음악이 끊기는 문제를 해결하기 위해, 음악 플레이어를 새 창(Pop-up)으로 띄워 지속적인 청취 경험을 제공했습니다.

  <img width="1280" height="764" alt="TuneMyMood-1" src="https://github.com/user-attachments/assets/898860a8-cce8-472c-a3c4-f85d948ee49c" />
<img width="1280" height="764" alt="TuneMyMood-2" src="https://github.com/user-attachments/assets/dd655e91-c0a4-4c36-a31e-d9b45e17380b" />
<img width="1280" height="764" alt="TuneMyMood-3" src="https://github.com/user-attachments/assets/dfb2d745-f686-4222-8788-45b517735b92" />
