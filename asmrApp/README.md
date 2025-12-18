# 🎧 Healing Mixer (ASMR Sound Therapy App)

> **"나만의 소리 공간을 디자인하다: 빗소리, 모닥불 등 백색 소음을 조합하여 집중과 휴식을 돕는 힐링 앱"**

Healing Mixer는 사용자가 다양한 백색 소음(ASMR)을 직접 선택하고 볼륨을 조절하여 자신만의 **'사운드스페이스'**를 만들 수 있는 모바일 애플리케이션입니다. React Native(Expo)를 기반으로 제작되었으며, 끊김 없는 루프 재생과 섬세한 수면 타이머 기능을 통해 몰입감 있는 청각 경험을 제공합니다.

## 🛠 Tech Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | <img src="https://img.shields.io/badge/React_Native-61DAFB?style=flat&logo=react&logoColor=black"/> <img src="https://img.shields.io/badge/Expo-000020?style=flat&logo=expo&logoColor=white"/> |
| **Language** | <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white"/> |
| **Audio & Storage** | <img src="https://img.shields.io/badge/Expo_AV-D93025?style=flat"/> <img src="https://img.shields.io/badge/Async_Storage-F7DF1E?style=flat&logo=javascript&logoColor=black"/> |
| **Navigation** | <img src="https://img.shields.io/badge/Expo_Router-000020?style=flat&logo=expo&logoColor=white"/> |

## Key Features

### 1. Multi-Channel Sound Mixer
* **개별 볼륨 제어:** 빗소리, 모닥불, 카페 소음 등 6가지 고품질 사운드를 동시에 재생할 수 있으며, 각 사운드의 볼륨을 개별 슬라이더로 정밀하게 조절할 수 있습니다.
* **Seamless Looping:** 모든 음원은 끊김 없이 반복 재생되도록 처리하여 장시간 청취 시에도 몰입감이 깨지지 않습니다.

### 2. Smart Random Mix
* **결정 장애 해결:** 어떤 소리를 들을지 고민하는 사용자를 위해 **배열 셔플링(Array Shuffling) 알고리즘**을 구현했습니다. 버튼 하나로 랜덤한 소리 조합과 볼륨 세팅을 자동으로 제안합니다.

### 3. Preset Management & Search
* **커스텀 프리셋 저장:** 현재 믹싱 된 사운드 조합을 이름과 함께 저장하고, 언제든 다시 불러올 수 있습니다.
* **데이터 영구 저장:** `AsyncStorage`를 활용하여 앱을 종료해도 저장된 프리셋이 유지됩니다.
* **고급 태그 검색:** 단순 제목 검색뿐만 아니라, **"빗소리가 포함된 믹스"**처럼 포함된 사운드 객체를 태그로 인식하여 필터링하는 검색 로직을 구현했습니다.

### 4. Sleep Timer with Fade-out
* **수면 최적화 타이머:** 15분, 30분, 60분 및 테스트용 10초 타이머를 제공합니다.
* **Linear Fade-out Logic:** 타이머 종료 5초 전부터 볼륨이 선형적으로 서서히 줄어드는 로직을 적용하여, 갑작스러운 소리 끊김으로 인한 수면 방해를 방지했습니다.

## Technical Highlights & Troubleshooting

### 비동기 오디오 리소스 관리
`Expo AV` 라이브러리를 사용하며 발생할 수 있는 메모리 누수를 방지하기 위해, 화면이 포커스를 잃거나 컴포넌트가 언마운트될 때 `unloadAsync()`를 호출하여 리소스를 정리하는 생명주기 관리를 철저히 했습니다.

### UX 중심의 Fade-out 알고리즘
단순히 소리를 끄는 `setTimeout` 대신, 남은 시간이 5초 미만일 때 매초 볼륨을 `originalVolume * (remainingTime / 5)` 비율로 재계산하여 적용함으로써 부드러운 청각적 종료 경험을 구현했습니다.

### 🔄 전역 상태 관리 (Context API)
타이머 상태와 프리셋 데이터가 믹서 화면(Mixer Tab)과 설정 화면(Settings Tab) 간에 실시간으로 동기화되어야 했습니다. 이를 위해 `TimerContext`와 `PresetContext`를 구축하여 복잡한 Props Drilling 없이 앱 전역에서 상태를 효율적으로 관리했습니다.

## Installation & Getting Started

이 프로젝트는 **Expo** 환경에서 실행됩니다.

```bash
# 1. Repository Clone
git clone [Your Repository URL]

# 2. Install Dependencies
npm install

# 3. Run Project
npx expo start

<img width="1280" height="764" alt="TuneMyMood-1" src="https://github.com/user-attachments/assets/511ed3b1-9aa2-4df5-848d-7d5f672fdd41" />
<img width="1280" height="764" alt="TuneMyMood-2" src="https://github.com/user-attachments/assets/0e6c7851-c1cb-42b3-a2d0-37b769839c80" />
<img width="1280" height="764" alt="TuneMyMood-3" src="https://github.com/user-attachments/assets/1a3999ec-c015-415e-ba8e-393e5a2cbd36" />

