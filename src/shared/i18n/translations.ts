export type Language = 'en' | 'vi' | 'fr' | 'zh' | 'it';

export const translations: Record<Language, any> = {
  en: {
    settingsTitle: 'MiniPet Settings',
    subtitle: 'Customize your desktop companion',
    choosePet: 'Choose Your Pet',
    importPet: 'Import New Pet',
    deletePet: 'Delete',
    pomodoroTimer: 'Pomodoro Timer',
    focus: 'Focus (min)',
    break: 'Break (min)',
    start: 'Start',
    pause: 'Pause',
    reset: 'Reset',
    standard: 'Standard',
    preferences: 'Preferences',
    petScale: 'Pet Scale',
    enableWalking: 'Enable Walking',
    walkingHint: 'Allow your pet to wander around the screen.',
    launchAtStartup: 'Launch at Startup',
    startupHint: 'Open MiniPet automatically when you log in.',
    interaction: 'Interaction',
    pingPet: 'Ping Pet',
    language: 'Language',
    statusIdle: 'Idle',
    statusFocus: 'Focus',
    statusBreak: 'Break',
    pingResponses: ['Yeah?', 'What is it?', 'Did you call me?', 'Hi!', 'I\'m here!'],
    pomoFinishedWork: 'Time for a break! 🐾',
    pomoFinishedBreak: 'Back to work! 💪',
    randomSpeeches: [
      'Drink some water! 💧',
      'Time to stand up and stretch! 🧘‍♂️',
      'Rest your eyes, look far away. 👀',
      'Don\'t overwork yourself! ☕',
      'You\'re doing great, but take a break. ✨',
      'Straighten your back! 🦒',
      'Deep breaths... in and out. 🌬️',
      'How about a short walk? 🚶‍♂️',
      'Stay hydrated! 🥤',
      'Work is important, but health is first! 🍎'
    ],
    eating: 'Yum yum! 😋',
    hello: 'Hello! 👋',
    exercise: 'Let\'s move! 🐾',
    run: 'Run away! 🏃‍♂️',
    movingDisabled: 'Moving is disabled!',
    trayControl: '🐾 MiniPet Control',
    trayToggle: 'Show/Hide Pet',
    trayQuit: 'Quit MiniPet',
    // Intelligence
    intelAppCode: [
      'Coding hard? Don\'t let bugs visit! 💻',
      'This function looks clean! ✨',
      'Remember to commit your changes! 🚀',
      'Take a deep breath before debugging. 🧘‍♂️'
    ],
    intelAppWeb: [
      'Looking for docs or just surfing? 🌐',
      'Too many tabs open, buddy! 📂',
      'Learning something new? 📚',
      'Stay focused, don\'t get lost in the web! 🕸️'
    ],
    intelAppMusic: [
      'Chill music, stay productive! 🎵',
      'This beat is fire! 🔥',
      'Music makes work better, right? 🎧'
    ],
    intelAppChat: [
      'New message? Reply quick and get back! 💬',
      'Everyone wants a piece of you today! 📱',
      'Socializing is good, but work is calling! 📞'
    ],
    intelAppTerminal: [
      'Type carefully, no sudo mistakes! ⌨️',
      'The power of the command line! 🖥️',
      'Hack the planet! 🕶️'
    ],
    intelAppDesign: [
      'Pixel perfect! 🎨',
      'Make it pop! ✨',
      'Design is thinking made visual. 🖌️'
    ],
    intelAppMeeting: [
      'Meeting time! Is your mic muted? 🎙️',
      'Don\'t fall asleep in there! 😴',
      'Take good notes! 📝'
    ],
    intelAppProductivity: [
      'Organizing your life? Great! 📝',
      'Writing something important? ✍️',
      'Efficiency is key! 🔑'
    ],
    intelAppFinder: [
      'Looking for something lost? 🔍',
      'Organizing files is therapeutic. 📁'
    ],
    intelAppDefault: [
      'You\'re working hard! Keep it up! ✨',
      'I\'m just here watching you be awesome. 🐾',
      'Need a coffee? ☕',
      'Doing great! 💪'
    ],
    // Web specific
    intelWebYoutube: [
      'Watching videos again? Don\'t get distracted! 📺',
      'Is this video educational or just for fun? 🤔',
      'One more video and back to work, okay? 🐾'
    ],
    intelWebSocial: [
      'Social media again? Stay focused, buddy! 📱',
      'Don\'t let the feed eat your time! 🕸️',
      'The scroll is endless, but your time isn\'t! ⏳'
    ],
    intelWebDev: [
      'Searching for a solution? You can do it! 💻',
      'Github! Time to contribute? 🚀',
      'StackOverflow is your best friend right now. 🤝'
    ],
    intelWebAI: [
      'Asking AI for help? Smart move! 🤖',
      'Asking the machines for advice? 🧠',
      'AI won\'t replace you, but it sure helps! ✨'
    ],
    intelWebDesign: [
      'Designing in the browser? Looking good! 🎨',
      'Web-based creativity at its best! ✨'
    ],
    intelTimeLate: [
      'It\'s late, time to sleep! 😴',
      'Your eyes need rest, buddy. 🌙',
      'The moon is up, why are you? 🏠'
    ],
    intelTimeLunch: [
      'Lunch time, take a break! 🍱',
      'Food is fuel! 🍎',
      'Go grab something delicious! 🍜'
    ],
  },
  vi: {
    settingsTitle: 'Cài đặt MiniPet',
    subtitle: 'Tùy chỉnh thú cưng của bạn',
    choosePet: 'Chọn Thú Cưng',
    importPet: 'Thêm Thú Cưng Mới',
    deletePet: 'Xoá',
    pomodoroTimer: 'Đồng hồ Pomodoro',
    focus: 'Tập trung (phút)',
    break: 'Nghỉ ngơi (phút)',
    start: 'Bắt đầu',
    pause: 'Tạm dừng',
    reset: 'Đặt lại',
    standard: 'Mặc định',
    preferences: 'Tùy chọn',
    petScale: 'Kích thước',
    enableWalking: 'Cho phép di chuyển',
    walkingHint: 'Cho phép thú cưng đi lại trên màn hình.',
    launchAtStartup: 'Khởi động cùng hệ thống',
    startupHint: 'Tự động mở MiniPet khi bạn đăng nhập.',
    interaction: 'Tương tác',
    pingPet: 'Gọi thú cưng',
    language: 'Ngôn ngữ',
    statusIdle: 'Đang chờ',
    statusFocus: 'Tập trung',
    statusBreak: 'Nghỉ ngơi',
    pingResponses: ['Ơi!', 'Gì thế?', 'Gọi tui hả?', 'Hú!', 'Đang nhảy đây!'],
    pomoFinishedWork: 'Nghỉ ngơi thôi sen ơi! 🐾',
    pomoFinishedBreak: 'Quay lại làm việc thôi! 💪',
    randomSpeeches: [
      'Uống miếng nước đi sen! 💧',
      'Đứng lên vươn vai tí nào! 🧘‍♂️',
      'Mỏi mắt rồi, nhìn ra xa đi! 👀',
      'Đừng làm việc quá sức nhé! ☕',
      'Làm tốt lắm, nhưng nghỉ tí đi. ✨',
      'Ngồi thẳng lưng lên nào! 🦒',
      'Hít thở sâu... 🌬️',
      'Đi loanh quanh một chút không? 🚶‍♂️',
      'Nhớ uống đủ nước nhé! 🥤',
      'Sức khỏe là vàng, đừng quên nha! 🍎'
    ],
    eating: 'Măm măm! Ngon quá! 😋',
    hello: 'Chào sen nhé! 👋',
    exercise: 'Vận động tí cho khỏe! 🐾',
    run: 'Chạy đi chờ chi! 🏃‍♂️',
    movingDisabled: 'Tính năng di chuyển đang tắt!',
    trayControl: '🐾 Điều khiển MiniPet',
    trayToggle: 'Hiện/Ẩn Thú Cưng',
    traySettings: 'Cài đặt...',
    trayQuit: 'Thoát MiniPet',
    // Intelligence
    intelAppCode: [
      'Đang tập trung code à? Đừng để bug ghé thăm nhé! 💻',
      'Hàm này viết hay đấy sen! ✨',
      'Nhớ commit code thường xuyên nha! 🚀',
      'Hít một hơi thật sâu rồi debug tiếp nào! 🧘‍♂️'
    ],
    intelAppWeb: [
      'Đang tìm tài liệu hay là đang lướt web giải trí đấy? 🌐',
      'Mở hơi bị nhiều tab rồi đó nha! 📂',
      'Lại đang học thêm kiến thức mới hả? 📚',
      'Tập trung vào, đừng để "mạng xã hội" cuốn đi! 🕸️'
    ],
    intelAppMusic: [
      'Nhạc chill quá, làm việc năng suất hẳn lên! 🎵',
      'Giai điệu này cháy quá sen ơi! 🔥',
      'Có nhạc vào làm việc khác hẳn nhỉ? 🎧'
    ],
    intelAppChat: [
      'Lại có tin nhắn mới à? Trả lời nhanh rồi làm việc tiếp nhé! 💬',
      'Hôm nay sen có vẻ đắt show nhắn tin quá nhỉ! 📱',
      'Tám chuyện ít thôi, tập trung chuyên môn nào! 📞'
    ],
    intelAppTerminal: [
      'Gõ lệnh cẩn thận nhé, đừng sudo nhầm! ⌨️',
      'Sức mạnh của dòng lệnh là đây! 🖥️',
      'Hacker chính hiệu là đây chứ đâu! 🕶️'
    ],
    intelAppDesign: [
      'Đẹp từng pixel luôn! 🎨',
      'Cho nó "vibrant" lên xíu nữa sen ơi! ✨',
      'Thiết kế là nghệ thuật, sen là nghệ sĩ! 🖌️'
    ],
    intelAppMeeting: [
      'Đến giờ họp rồi! Nhớ check xem tắt mic chưa nhé! 🎙️',
      'Đừng ngủ gật trong cuộc họp nha sen! 😴',
      'Nhớ ghi chú lại những ý quan trọng đấy! 📝'
    ],
    intelAppProductivity: [
      'Sắp xếp công việc hả? Tuyệt vời! 📝',
      'Đang viết lách gì đó quan trọng đúng không? ✍️',
      'Hiệu quả là chìa khóa thành công! 🔑'
    ],
    intelAppFinder: [
      'Đang tìm file gì bị thất lạc hả? 🔍',
      'Dọn dẹp thư mục cũng là một cách giải tỏa stress đấy! 📁'
    ],
    intelAppDefault: [
      'Sen làm việc chăm chỉ quá! Cố lên! ✨',
      'Tui vẫn luôn ở đây cổ vũ sen nè. 🐾',
      'Làm hớp cà phê cho tỉnh táo không? ☕',
      'Sen là nhất! 💪'
    ],
    // Web specific
    intelWebYoutube: [
      'Lại xem video à? Coi chừng bị cuốn quá nhé! 📺',
      'Video này có giúp ích cho công việc không đấy sen? 🤔',
      'Nốt video này rồi quay lại làm việc nhé! 🐾'
    ],
    intelWebSocial: [
      'Lại lướt mạng xã hội rồi! Tập trung đi sen ơi! 📱',
      'Đừng để tin tức làm xao nhãng nhé! 🕸️',
      'Cái feed là vô tận, nhưng thời gian thì không đâu! ⏳'
    ],
    intelWebDev: [
      'Đang tìm cách sửa bug hả? Chúc sen may mắn! 💻',
      'Github! Lại sắp có thêm một chiếc commit xịn xò? 🚀',
      'StackOverflow đúng là cứu cánh của đời dev! 🤝'
    ],
    intelWebAI: [
      'Đang nhờ AI làm hộ bài tập à? Khai mau! 🤖',
      'Nhờ máy móc tư vấn là nước đi đúng đắn đấy! 🧠',
      'AI không thay thế được sen, nhưng sẽ giúp sen nhàn hơn! ✨'
    ],
    intelWebDesign: [
      'Thiết kế trên web luôn à? Đỉnh đấy! 🎨',
      'Figma/Canva web à? Sáng tạo lên sen ơi! ✨'
    ],
    intelTimeLate: [
      'Muộn rồi đấy, đi ngủ thôi bạn ơi! 😴',
      'Mắt sen đỏ hết rồi kìa, nghỉ ngơi đi. 🌙',
      'Giờ này đến cú còn ngủ, sao sen vẫn thức? 🏠'
    ],
    intelTimeLunch: [
      'Đến giờ ăn trưa rồi, nghỉ ngơi xíu đi! 🍱',
      'Có thực mới vực được đạo, đi ăn thôi! 🍎',
      'Kiếm món gì ngon ngon tự thưởng cho mình đi! 🍜'
    ],
  },
  fr: {
    settingsTitle: 'Paramètres MiniPet',
    subtitle: 'Personnalisez votre compagnon de bureau',
    choosePet: 'Choisissez Votre Animal',
    importPet: 'Importer un Nouvel Animal',
    deletePet: 'Supprimer',
    pomodoroTimer: 'Minuteur Pomodoro',
    focus: 'Focus (min)',
    break: 'Pause (min)',
    start: 'Démarrer',
    pause: 'Pause',
    reset: 'Réinitialiser',
    standard: 'Standard',
    preferences: 'Préférences',
    petScale: 'Échelle de l\'animal',
    enableWalking: 'Activer la marche',
    walkingHint: 'Permettez à votre animal de se promener sur l\'écran.',
    launchAtStartup: 'Lancer au démarrage',
    startupHint: 'Ouvrir MiniPet automatiquement à la connexion.',
    interaction: 'Interaction',
    pingPet: 'Appeler l\'animal',
    language: 'Langue',
    statusIdle: 'Inactif',
    statusFocus: 'Focus',
    statusBreak: 'Pause',
    pingResponses: ['Oui ?', 'Qu\'est-ce que c\'est ?', 'Tu m\'as appelé ?', 'Salut !', 'Je suis là !'],
    pomoFinishedWork: 'C\'est l\'heure de la pause ! 🐾',
    pomoFinishedBreak: 'Au travail ! 💪',
    randomSpeeches: [
      'Bois un peu d\'eau ! 💧',
      'Il est temps de s\'étirer ! 🧘‍♂️',
      'Repose tes yeux, regarde au loin. 👀',
      'Ne te surmène pas ! ☕',
      'C\'est super, mais fais une pause. ✨',
      'Tiens-toi droit ! 🦒',
      'Prends une grande inspiration... 🌬️',
      'Et si on marchait un peu ? 🚶‍♂️',
      'Hydrate-toi ! 🥤',
      'La santé avant tout ! 🍎'
    ],
    eating: 'Miam miam ! 😋',
    hello: 'Salut ! 👋',
    exercise: 'Bougeons un peu ! 🐾',
    run: 'En avant ! 🏃‍♂️',
    movingDisabled: 'Le mouvement est désactivé !',
    trayControl: '🐾 Contrôle MiniPet',
    trayToggle: 'Afficher/Masquer l\'animal',
    traySettings: 'Paramètres...',
    trayQuit: 'Quitter MiniPet',
  },
  zh: {
    settingsTitle: 'MiniPet 设置',
    subtitle: '自定义您的桌面伙伴',
    choosePet: '选择您的宠物',
    importPet: '导入新宠物',
    deletePet: '删除',
    pomodoroTimer: '番茄时钟',
    focus: '专注 (分钟)',
    break: '休息 (分钟)',
    start: '开始',
    pause: '暂停',
    reset: '重置',
    standard: '标准',
    preferences: '偏好设置',
    petScale: '宠物比例',
    enableWalking: '启用走路',
    walkingHint: '允许您的宠物在屏幕上游走。',
    launchAtStartup: '开机启动',
    startupHint: '登录时自动打开 MiniPet。',
    interaction: '互动',
    pingPet: '呼叫宠物',
    language: '语言',
    statusIdle: '空闲',
    statusFocus: '专注',
    statusBreak: '休息',
    pingResponses: ['哎！', '干嘛？', '叫我吗？', '嘿！', '我在呢！'],
    pomoFinishedWork: '休息时间到了！ 🐾',
    pomoFinishedBreak: '该工作了！ 💪',
    randomSpeeches: [
      '喝点水吧！ 💧',
      '起来伸个懒腰吧！ 🧘‍♂️',
      '休息下眼睛，看看远处。 👀',
      '别太累了！ ☕',
      '你做得很好，但该休息了。 ✨',
      '挺直腰板！ 🦒',
      '深呼吸... 🌬️',
      '出去走走怎么样？ 🚶‍♂️',
      '保持水分！ 🥤',
      '健康第一，工作第二！ 🍎'
    ],
    eating: '真好吃！ 😋',
    hello: '你好！ 👋',
    exercise: '运动一下！ 🐾',
    run: '跑起来！ 🏃‍♂️',
    movingDisabled: '移动功能已禁用！',
    trayControl: '🐾 MiniPet 控制',
    trayToggle: '显示/隐藏宠物',
    traySettings: '设置...',
    trayQuit: '退出 MiniPet',
  },
  it: {
    settingsTitle: 'Impostazioni MiniPet',
    subtitle: 'Personalizza il tuo compagno desktop',
    choosePet: 'Scegli il Tuo Animale',
    importPet: 'Importa Nuovo Animale',
    deletePet: 'Elimina',
    pomodoroTimer: 'Timer Pomodoro',
    focus: 'Focus (min)',
    break: 'Pausa (min)',
    start: 'Inizia',
    pause: 'Pausa',
    reset: 'Reset',
    standard: 'Standard',
    preferences: 'Preferenze',
    petScale: 'Scala Animale',
    enableWalking: 'Abilita Camminata',
    walkingHint: 'Permetti al tuo animale di girovagare per lo schermo.',
    launchAtStartup: 'Avvia all\'accensione',
    startupHint: 'Apri MiniPet automaticamente al login.',
    interaction: 'Interazione',
    pingPet: 'Chiama Animale',
    language: 'Lingua',
    statusIdle: 'Inattivo',
    statusFocus: 'Focus',
    statusBreak: 'Pausa',
    pingResponses: ['Sì?', 'Cosa c\'è?', 'Mi hai chiamato?', 'Ehi!', 'Sono qui!'],
    pomoFinishedWork: 'È ora di una pausa! 🐾',
    pomoFinishedBreak: 'Torna al lavoro! 💪',
    randomSpeeches: [
      'Bevi un po\' d\'acqua! 💧',
      'È ora di alzarsi e stiracchiarsi! 🧘‍♂️',
      'Riposa gli occhi, guarda lontano. 👀',
      'Non stancarti troppo! ☕',
      'Stai andando bene, ma riposati. ✨',
      'Schiena dritta! 🦒',
      'Fai un respiro profondo... 🌬️',
      'Che ne dici di una passeggiata? 🚶‍♂️',
      'Rimani idratato! 🥤',
      'La salute è importante! 🍎'
    ],
    eating: 'Gnam gnam! 😋',
    hello: 'Ciao! 👋',
    exercise: 'Muoviamoci un po\'! 🐾',
    run: 'Scappa! 🏃‍♂️',
    movingDisabled: 'Il movemento è disabilitato!',
    trayControl: '🐾 Controllo MiniPet',
    trayToggle: 'Mostra/Nascondi Animale',
    traySettings: 'Impostazioni...',
    trayQuit: 'Esci da MiniPet',
  },
};
