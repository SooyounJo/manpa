// Breath-triggered narrative script (partial per spec). Durations in ms.
// Audio files expected at /audio/exhale{n}.mp3 (silently skipped if missing).

export const narrativeBeats = [
  // Chapter 1 (inhale, 2s each) — bg DBE7EA
  { id: '1-1', trigger: 'inhale', lines: ["오늘 몇 번의 파도가\n당신의 마음 속에 일었나요?"], lineMs: 2000, bgColor: '#DBE7EA' },
  { id: '1-2', trigger: 'inhale', lines: ["아주 작은 흔들림부터, 조금 더 크게 밀려온 순간들까지"], lineMs: 2000, bgColor: '#DBE7EA' },
  { id: '1-3', trigger: 'inhale', lines: ["지금은 그것들을 억지로 멀리 보내지 않아도 됩니다"], lineMs: 2000, bgColor: '#DBE7EA' },
  { id: '1-4', trigger: 'inhale', lines: ["그저 천천히, 하나씩 떠올려 봅니다"], lineMs: 2000, bgColor: '#DBE7EA' },
  // Interlude → fade to black
  { id: 'i-1', trigger: 'none', lines: [], lineMs: 0, interludeMs: 3000, bgColor: '#000000' },

  // Chapter 2 (exhale / inhale)
  { id: '2-1', trigger: 'exhale', lines: ["신라 시대 어느 옛 마을,\n고요한 호수 아래", "오래전부터 한 마리 용이 잠들어\n나라의 흥망을 지켜본다는\n전설이 깃들어 있었다"], lineMs: 3000, audio: 'exhale1.mp3' },
  { id: '2-3', trigger: 'inhale', lines: ["사람들은 물결이 잔잔한 날이면\n용의 숨결이 들판을 어루만져\n풍년이 들고,", "파도가 높아지는 날이면\n그저 마음을 모아 조용히 기도했다.”"], lineMs: 3000 },
  // Interlude → DBE7EA
  { id: 'i-2', trigger: 'none', lines: [], lineMs: 0, interludeMs: 3000, bgColor: '#DBE7EA' },

  // Chapter 3
  { id: '3-1', trigger: 'exhale', lines: ["지금 떠올린 당신의 물결도", "그 옛 사람들의 마음에 이는\n파도와 닮아 있습니다"], lineMs: 3000, audio: 'exhale2.mp3' },
  { id: '3-4', trigger: 'inhale', lines: ["당신의 마음을 스친 물결을\n천천히 떠올립니다"], lineMs: 3000 },
  // Interlude → black
  { id: 'i-3', trigger: 'none', lines: [], lineMs: 0, interludeMs: 3000, bgColor: '#000000' },

  // Chapter 4
  { id: '4-1', trigger: 'inhale', lines: ["그렇게 평온한 세월이 이어지던\n어느 시기, 이유를 알 수 없는\n병이 온 나라에 퍼졌다", "들판은 숨결을 잃고,\n아이들의 목소리도 바람 끝에서\n묽어졌다"], lineMs: 3000 },
  // Interlude
  { id: 'i-4', trigger: 'none', lines: [], lineMs: 0, interludeMs: 3000 },
  { id: '4-3', trigger: 'exhale', lines: ["그러던 어느 날, 바닷가의 파도 속에서", "한 사내가 오래된 피리 하나를\n건져 올려 왕에게 바쳤다"], lineMs: 3000, audio: 'exhale3.mp3' },
  // Interlude → DBE7EA
  { id: 'i-5', trigger: 'none', lines: [], lineMs: 0, interludeMs: 3000, bgColor: '#DBE7EA' },

  // Chapter 5
  { id: '5-1', trigger: 'inhale', lines: ["당신 마음에도 오랫동안\n말없이 기다려온\n피리 하나가 있습니다", "그 피리는 당신의 숨에서 울리고,\n당신만이 들을 수 있는\n부드러운 소리를 냅니다"], lineMs: 3000 },
  // Interlude + exhale4
  { id: 'i-6', trigger: 'exhale', lines: [], lineMs: 0, interludeMs: 3000, audio: 'exhale4.mp3' },
  { id: '5-3', trigger: 'exhale', lines: ["이제 당신의 만파식적을 꺼내 듭니다\n어떤 물결이라도, 당신은 그것을\n잠재울 힘을 가지고 있습니다", "그 숨결이 곧 당신의 피리 소리입니다"], lineMs: 3000 },
  // Interlude → black
  { id: 'i-7', trigger: 'none', lines: [], lineMs: 0, interludeMs: 3000, bgColor: '#000000' },

  // Chapter 6
  { id: '6-1', trigger: 'inhale', lines: ["이 피리가 하늘에서 내려온 것이라는 말이\n퍼지자, 왕은 한 줄기 숨을 불어 넣었다", "그러자 번잡했던 세상과\n사람들의 마음이 평온해졌다"], lineMs: 3000 },
  // Interlude → DBE7EA
  { id: 'i-8', trigger: 'none', lines: [], lineMs: 0, interludeMs: 3000, bgColor: '#DBE7EA' },

  // Chapter 7
  { id: '7-1', trigger: 'exhale', lines: ["그 피리의 숨결을 닮은 당신의 호흡 속에서", "당신의 마음도 조금씩 고요해집니다"], lineMs: 3000, audio: 'exhale5.mp3' },
  { id: '7-3', trigger: 'inhale', lines: ["그리고 당신은 알아차립니다"], lineMs: 3000 },
  // Interlude
  { id: 'i-9', trigger: 'none', lines: [], lineMs: 0, interludeMs: 3000 },

  // Chapter 8
  { id: '8-1', trigger: 'inhale', lines: ["한순간 크게 다가오는 파도이더라도\n이내 다시 잔잔해진다는 것을", "그리고 그 또한\n자연의 일부라는 것을"], lineMs: 3000 },
  // Interlude
  { id: 'i-10', trigger: 'none', lines: [], lineMs: 0, interludeMs: 3000 },
  { id: '8-4', trigger: 'exhale', lines: ["당신의 마음에 남은\n모든 물결이 잦아들고,", "아주 고요한 산들바람만이\n부드럽게 당신을 감싸 줍니다"], lineMs: 3000, audio: 'exhale6.mp3' },
  // Interlude → black
  { id: 'i-11', trigger: 'none', lines: [], lineMs: 0, interludeMs: 3000, bgColor: '#000000' },

  // Chapter 9
  { id: '9-1', trigger: 'inhale', lines: ["그날 이후 사람들은 기억한다\n만 개의 파도를 잠재우는 피리", "마음을 어루만지는 숨결 만파식적"], lineMs: 3000 },

  // Keep potential finals hidden for now
  { id: 'final-1', trigger: 'none', lines: [], lineMs: 0, interludeMs: 0, hidden: true },
  { id: 'final-2', trigger: 'none', lines: [], lineMs: 0, interludeMs: 0, hidden: true },
];


