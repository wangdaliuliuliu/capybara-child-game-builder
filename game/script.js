/* ========================================
   水豚奶茶接接乐 - 游戏逻辑
   原生 JavaScript，无需框架
   ======================================== */

// ===== DOM References =====
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const gameArea = document.getElementById('game-area');
const capybara = document.getElementById('capybara');
const scoreEl = document.getElementById('score');
const heartsEl = document.getElementById('hearts');
const levelEl = document.getElementById('level');
const finalScoreEl = document.getElementById('final-score-value');
const finalLevelEl = document.getElementById('final-level');
const gameoverMsgEl = document.getElementById('gameover-message');
const effectsContainer = document.getElementById('effects-container');
const summonStatusEl = document.getElementById('summon-status');
const summonStatusLabelEl = document.getElementById('summon-status-label');
const summonEnergyEl = document.getElementById('summon-energy');
const summonProgressEl = document.getElementById('summon-progress');
const nextHelperNameEl = document.getElementById('next-helper-name');
const summonBtn = document.getElementById('summon-btn');
const accountOptions = [...document.querySelectorAll('.account-option')];
const selectedPasswordHintEl = document.getElementById('selected-password-hint');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const loginMessageEl = document.getElementById('login-message');
const leaderboardListEl = document.getElementById('leaderboard-list');
const leaderboardMessageEl = document.getElementById('leaderboard-message');

// Mobile controls
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

// ===== Game Constants =====
const CAPY_WIDTH = 70;
const CAPY_HEIGHT = 60;
const CAPY_SPEED = 6; // pixels per frame
const INITIAL_LIVES = 5;
const INITIAL_SPAWN_INTERVAL = 1200; // ms
const MIN_SPAWN_INTERVAL = 400; // ms
const INITIAL_FALL_SPEED = 2; // pixels per frame
const MAX_FALL_SPEED = 8;
const LEVEL_UP_SCORE = 50; // score per level
const ITEM_SIZE = 36; // approximate size of falling items
const SUMMON_COST = 200;
const DAMAGE_SCORE_PENALTY = 50;
const HELPER_PHASE_DURATIONS = {
    // 进场动作完整播放，但必须在 2 秒以内结束。
    enter: 1800,
    cast: 700,
    exit: 500,
};

// ===== Item Definitions =====
const GOOD_ITEMS = [
    { emoji: '🥤', name: '奶茶', points: 30 },
    { emoji: '🔮', name: '珍珠', points: 20 },
    { emoji: '❤️', name: '爱心', points: 16 },
    { emoji: '🍓', name: '草莓', points: 24 },
    { emoji: '🍰', name: '蛋糕', points: 20 },
    { emoji: '🍮', name: '布丁', points: 20 },
    { emoji: '🍡', name: '团子', points: 24 },
    { emoji: '🌸', name: '樱花', points: 10 },
    { emoji: '🍪', name: '曲奇', points: 16 },
    { emoji: '🍩', name: '甜甜圈', points: 20 },
];

const BAD_ITEMS = [
    { emoji: '🌶️', name: '辣椒', damage: 1 },
    { emoji: '💣', name: '炸弹', damage: 1 },
    { emoji: '⛈️', name: '乌云', damage: 1 },
    { emoji: '🍋', name: '酸柠檬', damage: 1 },
    { emoji: '💀', name: '骷髅', damage: 2 },
    { emoji: '🦂', name: '蝎子', damage: 1 },
    { emoji: '👻', name: '幽灵', damage: 1 },
];

// ===== Helper Roles =====
// 四位帮手按孩子编号固定顺序召唤：小月 → 小溪 → 小曦 → 小伊。
const HELPERS = [
    {
        id: 'helper-1',
        name: '小月',
        emoji: '🧜‍♀️',
        color: '#FF9DC8',
        image: 'assets/helper-1.png',
        skillId: 'mermaid-speed',
        skillName: '美人鱼加速',
        effectDuration: 6000,
    },
    {
        id: 'helper-2',
        name: '小溪',
        emoji: '💜',
        color: '#CBA4FF',
        image: 'assets/helper-2.png',
        skillId: 'magic-cake',
        skillName: '爱心魔法蛋糕',
        effectDuration: 1800,
    },
    {
        id: 'helper-3',
        name: '小曦',
        emoji: '🌬️',
        color: '#9DDCF5',
        image: 'assets/helper-3.png',
        skillId: 'wind-clear',
        skillName: '风之清场',
        effectDuration: 1400,
    },
    {
        id: 'helper-4',
        name: '小伊',
        emoji: '❄️',
        color: '#F6B8D4',
        image: 'assets/helper-4.png',
        skillId: 'ice-safe',
        skillName: '冰冻保护',
        effectDuration: 6000,
    },
];

// ===== Game Over Messages =====
const GAMEOVER_MESSAGES = [
    "珍珠们会想你的！🔮",
    "水豚也需要休息一下哦～💤",
    "奶茶之神会等你回来的！🍵",
    "可爱的水豚，你已经做得很棒了！🌸",
    "该来一次真正的奶茶休息时间啦！🥤",
];

// ===== Game State =====
let state = {
    score: 0,
    lives: INITIAL_LIVES,
    level: 1,
    isRunning: false,
    isPaused: false,
    capyX: 0, // capybara X position
    items: [], // active falling items
    fallSpeed: INITIAL_FALL_SPEED,
    spawnInterval: INITIAL_SPAWN_INTERVAL,
    lastSpawnTime: 0,
    animFrameId: null,
    lastTime: 0,
    spawnTimerId: null,
    keysPressed: {},
    mobileLeft: false,
    mobileRight: false,
    playerSpeedMultiplier: 1,
    frozenBadUntil: 0,
    summonEnergy: 0,
    summonReady: false,
    nextHelperIndex: 0,
    summon: {
        active: false,
        phase: 'idle',
        phaseStartedAt: 0,
        effectEndsAt: 0,
        effectActive: false,
        effectApplied: false,
        exitComplete: false,
        helper: null,
        helperEl: null,
    },
};

const AUTH_STORAGE_KEY = 'capybara-bubble-tea-auth-token';
let selectedAccountId = 'child-1';
let authState = {
    token: null,
    account: null,
};

// 这是一个公开试玩版，密码按用户要求直接显示在登录页。
const ACCOUNT_PASSWORD_HINTS = {
    'child-1': { nickname: '小月', password: '1010' },
    'child-2': { nickname: '小溪', password: '2020' },
    'child-3': { nickname: '小曦', password: '3030' },
    'child-4': { nickname: '小伊', password: '4040' },
};

// ===== Audio System (Web Audio API) =====
let audioCtx = null;

/** Initialize AudioContext on first user interaction */
function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            // Audio not supported, fail silently
            console.log('当前浏览器不支持网页音频');
        }
    }
}

/** Play a short beep/tone */
function playSound(frequency, duration, type = 'sine', volume = 0.15) {
    if (!audioCtx) return;
    try {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
        // Silently ignore audio errors
    }
}

/** Sound effects */
function playCatchSound() {
    playSound(880, 0.15, 'sine', 0.12);
    setTimeout(() => playSound(1100, 0.1, 'sine', 0.08), 80);
}

function playHurtSound() {
    playSound(200, 0.2, 'square', 0.1);
    setTimeout(() => playSound(150, 0.15, 'square', 0.08), 100);
}

function playGameOverSound() {
    playSound(440, 0.3, 'sine', 0.12);
    setTimeout(() => playSound(330, 0.3, 'sine', 0.1), 200);
    setTimeout(() => playSound(220, 0.5, 'sine', 0.08), 400);
}

function playLevelUpSound() {
    playSound(523, 0.15, 'sine', 0.1);
    setTimeout(() => playSound(659, 0.15, 'sine', 0.1), 100);
    setTimeout(() => playSound(784, 0.2, 'sine', 0.1), 200);
}

// ===== Screen Management =====
function showScreen(screen) {
    [startScreen, gameScreen, gameoverScreen].forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

function setLoginMessage(message, type = '') {
    loginMessageEl.textContent = message;
    loginMessageEl.className = `login-message ${type}`.trim();
}

function clearAuth() {
    authState = { token: null, account: null };
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    startBtn.disabled = true;
    startBtn.textContent = '🔐 登录后开始';
}

async function apiRequest(endpoint, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    if (authState.token) {
        headers.Authorization = `Bearer ${authState.token}`;
    }

    const response = await fetch(endpoint, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.message || `请求失败（${response.status}）`);
    }
    return payload;
}

function selectAccount(accountId) {
    selectedAccountId = accountId;
    accountOptions.forEach(option => {
        option.classList.toggle('selected', option.dataset.accountId === accountId);
    });
    const accountHint = ACCOUNT_PASSWORD_HINTS[accountId];
    if (accountHint && selectedPasswordHintEl) {
        selectedPasswordHintEl.textContent = `${accountHint.nickname}的密码：${accountHint.password}`;
    }
    setLoginMessage('');
    passwordInput.focus();
}

function applyLoggedInAccount(account) {
    authState.account = account;
    startBtn.disabled = false;
    startBtn.textContent = '🥤 开始游戏！';
    setLoginMessage(`已登录：${account.nickname}，点击下方开始游戏。`, 'success');
}

async function handleLogin() {
    const password = passwordInput.value.trim();
    if (!password) {
        setLoginMessage('请先输入密码。', 'error');
        passwordInput.focus();
        return;
    }

    loginBtn.disabled = true;
    setLoginMessage('正在登录……');
    try {
        const result = await apiRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify({ accountId: selectedAccountId, password }),
        });
        authState.token = result.token;
        sessionStorage.setItem(AUTH_STORAGE_KEY, result.token);
        passwordInput.value = '';
        applyLoggedInAccount(result.account);
    } catch (error) {
        clearAuth();
        setLoginMessage(error.message, 'error');
    } finally {
        loginBtn.disabled = false;
    }
}

async function restoreSession() {
    const token = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!token) return;

    authState.token = token;
    try {
        const result = await apiRequest('/api/me');
        applyLoggedInAccount(result.account);
    } catch (error) {
        clearAuth();
        setLoginMessage('登录已过期，请重新输入密码。', 'error');
    }
}

function renderLeaderboard(rows) {
    leaderboardListEl.replaceChildren();
    rows.forEach((row, index) => {
        const item = document.createElement('li');
        item.className = 'leaderboard-row';

        const rank = document.createElement('span');
        rank.className = 'leaderboard-rank';
        rank.textContent = `${index + 1}.`;

        const nickname = document.createElement('span');
        nickname.className = 'leaderboard-name';
        nickname.textContent = row.nickname;

        const score = document.createElement('span');
        score.className = 'leaderboard-score';
        score.textContent = `${row.highestScore} 分`;

        item.append(rank, nickname, score);
        leaderboardListEl.appendChild(item);
    });
}

async function loadLeaderboard() {
    leaderboardMessageEl.textContent = '排行榜加载中……';
    try {
        const result = await apiRequest('/api/leaderboard');
        renderLeaderboard(result.leaderboard);
        leaderboardMessageEl.textContent = '比较每位玩家的最高分。';
    } catch (error) {
        leaderboardListEl.replaceChildren();
        leaderboardMessageEl.textContent = error.message;
    }
}

async function submitScoreAndRefreshLeaderboard() {
    if (!authState.token) {
        leaderboardMessageEl.textContent = '登录状态已失效，本局分数未能保存。';
        return;
    }

    leaderboardMessageEl.textContent = '正在保存本局最高分……';
    try {
        await apiRequest('/api/scores', {
            method: 'POST',
            body: JSON.stringify({ score: state.score, level: state.level }),
        });
        await loadLeaderboard();
    } catch (error) {
        leaderboardMessageEl.textContent = error.message;
    }
}

// ===== Game Initialization =====
function resetState() {
    state.score = 0;
    state.lives = INITIAL_LIVES;
    state.level = 1;
    state.isRunning = false;
    state.isPaused = false;
    state.items = [];
    state.fallSpeed = INITIAL_FALL_SPEED;
    state.spawnInterval = INITIAL_SPAWN_INTERVAL;
    state.lastSpawnTime = 0;
    state.lastTime = 0;
    state.keysPressed = {};
    state.mobileLeft = false;
    state.mobileRight = false;
    state.playerSpeedMultiplier = 1;
    state.frozenBadUntil = 0;
    state.summonEnergy = 0;
    state.summonReady = false;
    state.nextHelperIndex = 0;
    state.summon = {
        active: false,
        phase: 'idle',
        phaseStartedAt: 0,
        effectEndsAt: 0,
        effectActive: false,
        effectApplied: false,
        exitComplete: false,
        helper: null,
        helperEl: null,
    };

    // Cancel any running loops/timers
    if (state.animFrameId) {
        cancelAnimationFrame(state.animFrameId);
        state.animFrameId = null;
    }
    if (state.spawnTimerId) {
        clearInterval(state.spawnTimerId);
        state.spawnTimerId = null;
    }
}

function startGame() {
    if (!authState.account || !authState.token) {
        setLoginMessage('请先选择昵称并登录。', 'error');
        return;
    }

    initAudio();
    resetState();

    // Clear old items from DOM
    const oldItems = gameArea.querySelectorAll('.falling-item');
    oldItems.forEach(el => el.remove());
    const oldHelpers = gameArea.querySelectorAll('.helper-character');
    oldHelpers.forEach(el => el.remove());
    gameArea.classList.remove('helper-effect');

    // Remove any lingering effects
    const effects = effectsContainer.querySelectorAll('*');
    effects.forEach(el => el.remove());

    // Reset capybara position to center
    const areaWidth = gameArea.clientWidth;
    state.capyX = (areaWidth - CAPY_WIDTH) / 2;
    capybara.style.left = state.capyX + 'px';
    capybara.classList.remove('hit', 'happy');

    // Update HUD
    updateHUD();

    // Show game screen
    showScreen(gameScreen);

    // Start game loop
    state.isRunning = true;
    state.lastTime = performance.now();
    state.lastSpawnTime = performance.now();
    state.animFrameId = requestAnimationFrame(gameLoop);
}

// ===== HUD Updates =====
function updateHUD() {
    scoreEl.textContent = state.score;
    levelEl.textContent = state.level;
    
    // Render hearts
    let heartsStr = '';
    for (let i = 0; i < INITIAL_LIVES; i++) {
        heartsStr += i < state.lives ? '❤️' : '🖤';
    }
    heartsEl.textContent = heartsStr;

    // 召唤能量满后固定为 200，不向下一次召唤溢出。
    const energy = Math.min(SUMMON_COST, state.summonEnergy);
    summonEnergyEl.textContent = energy;
    summonProgressEl.style.width = `${(energy / SUMMON_COST) * 100}%`;
    const nextHelper = HELPERS[state.nextHelperIndex];
    nextHelperNameEl.textContent = nextHelper.name;

    if (state.summonReady) {
        summonStatusLabelEl.textContent = '✨ 可以召唤！';
    } else {
        summonStatusLabelEl.textContent = '✨ 召唤能量';
    }

    summonBtn.disabled = !state.isRunning || state.summon.active || !state.summonReady;
    summonBtn.textContent = state.summonReady ? `召唤${nextHelper.name}` : '召唤';
}

/** Add score to the one-time 200-point summon meter. */
function addSummonEnergy(points) {
    if (state.summonReady) return;

    state.summonEnergy = Math.min(SUMMON_COST, state.summonEnergy + points);
    if (state.summonEnergy >= SUMMON_COST) {
        state.summonEnergy = SUMMON_COST;
        state.summonReady = true;
        playSound(1046, 0.2, 'sine', 0.1);
        showFloatText(gameArea.clientWidth / 2, gameArea.clientHeight * 0.35, '✨ 可以召唤帮手了！', 'good');
    }
}

function createHelperElement(helper) {
    const el = document.createElement('div');
    el.className = `helper-character entering helper-${helper.id}`;
    el.dataset.phase = 'enter';
    el.dataset.helperId = helper.id;
    el.style.setProperty('--helper-color', helper.color);

    const orb = helper.image ? document.createElement('img') : document.createElement('div');
    orb.className = helper.image ? 'helper-sprite' : 'helper-orb';
    if (helper.image) {
        orb.src = helper.image;
        orb.alt = helper.name;
        orb.draggable = false;
    } else {
        orb.textContent = helper.emoji;
    }

    const name = document.createElement('div');
    name.className = 'helper-name';
    name.textContent = helper.name;

    el.append(orb, name);
    gameArea.appendChild(el);

    // 让“进场”从画面外滑到中央，给将来替换真实素材保留同一个入口。
    requestAnimationFrame(() => el.classList.add('entered'));
    return el;
}

function setSummonPhase(phase, timestamp) {
    const summon = state.summon;
    summon.phase = phase;
    summon.phaseStartedAt = timestamp;

    if (phase !== 'enter') {
        // 进场动作完成后才恢复整个游戏世界。
        state.isPaused = false;
        gameArea.classList.remove('summon-paused');
    }

    if (!summon.helperEl) return;
    const el = summon.helperEl;
    el.dataset.phase = phase;
    el.classList.remove('entering', 'entered', 'casting', 'exiting');

    if (phase === 'enter') {
        el.classList.add('entering');
        requestAnimationFrame(() => el.classList.add('entered'));
    } else if (phase === 'cast') {
        el.classList.add('casting');
    } else if (phase === 'exit') {
        el.classList.add('exiting');
    }
}

function spawnMagicCakeItem() {
    if (!state.isRunning) return;

    const areaWidth = gameArea.clientWidth;
    const itemData = { emoji: '🍰', name: '魔法蛋糕', points: 200 };
    const x = Math.max(0, Math.random() * Math.max(1, areaWidth - ITEM_SIZE));
    const el = document.createElement('div');
    el.className = 'falling-item good skill-cake';
    el.textContent = itemData.emoji;
    el.style.left = `${x}px`;
    el.style.top = '-48px';
    gameArea.appendChild(el);

    state.items.push({
        el,
        x,
        y: -48,
        isGood: true,
        data: itemData,
        speed: Math.max(1.5, state.fallSpeed * 0.72),
        isSkillItem: true,
    });
}

function clearBadItemsWithWind() {
    const badItems = state.items.filter(item => !item.isGood);
    state.items = state.items.filter(item => item.isGood);

    badItems.forEach((item, index) => {
        item.el.classList.add('blown-away');
        item.el.style.setProperty('--wind-delay', `${index * 35}ms`);
        window.setTimeout(() => item.el.remove(), 850 + index * 35);
    });
}

function freezeBadItems(until) {
    state.frozenBadUntil = until;
    state.items.forEach(item => {
        if (!item.isGood) {
            item.harmlessUntil = until;
            item.el.classList.add('frozen-bad');
        }
    });
}

function updateFrozenBadItems(timestamp) {
    if (state.frozenBadUntil && timestamp >= state.frozenBadUntil) {
        state.frozenBadUntil = 0;
    }

    state.items.forEach(item => {
        if (item.isGood) return;
        const harmless = item.harmlessUntil && timestamp < item.harmlessUntil;
        item.el.classList.toggle('frozen-bad', Boolean(harmless));
    });
}

function startHelperEffect(timestamp) {
    const summon = state.summon;
    const helper = summon.helper;
    summon.effectActive = true;
    summon.effectApplied = true;
    summon.effectEndsAt = timestamp + (helper.effectDuration || 1200);
    gameArea.classList.remove('helper-effect');
    void gameArea.offsetWidth;
    gameArea.classList.add('helper-effect', `skill-${helper.skillId}`);

    if (helper.skillId === 'mermaid-speed') {
        state.playerSpeedMultiplier = 2;
    } else if (helper.skillId === 'magic-cake') {
        spawnMagicCakeItem();
    } else if (helper.skillId === 'wind-clear') {
        clearBadItemsWithWind();
    } else if (helper.skillId === 'ice-safe') {
        freezeBadItems(timestamp + helper.effectDuration);
    }

    showFloatText(
        gameArea.clientWidth / 2,
        gameArea.clientHeight * 0.42,
        `${helper.emoji} ${helper.name}：${helper.skillName}`,
        'good'
    );
    playSound(660, 0.18, 'triangle', 0.1);
}

function finishHelperEffect() {
    const helper = state.summon.helper;
    if (helper?.skillId) {
        gameArea.classList.remove(`skill-${helper.skillId}`);
    }
    if (helper?.skillId === 'mermaid-speed') {
        state.playerSpeedMultiplier = 1;
    }
    if (helper?.skillId === 'ice-safe') {
        state.frozenBadUntil = 0;
        state.items.forEach(item => {
            if (!item.isGood) {
                item.harmlessUntil = 0;
                item.el.classList.remove('frozen-bad');
            }
        });
    }
    state.summon.effectActive = false;
    gameArea.classList.remove('helper-effect');
}

function finishSummon() {
    const summon = state.summon;
    if (summon.helperEl) summon.helperEl.remove();
    summon.active = false;
    summon.phase = 'idle';
    summon.helper = null;
    summon.helperEl = null;
    state.isPaused = false;
    gameArea.classList.remove('summon-paused');
    updateHUD();
}

function updateSummon(timestamp) {
    const summon = state.summon;
    if (!summon.active) return;

    if (summon.effectActive && timestamp >= summon.effectEndsAt) {
        finishHelperEffect();
    }

    const elapsed = timestamp - summon.phaseStartedAt;
    if (summon.phase === 'enter' && elapsed >= HELPER_PHASE_DURATIONS.enter) {
        setSummonPhase('cast', timestamp);
    } else if (summon.phase === 'cast') {
        if (!summon.effectApplied && elapsed >= 250) {
            startHelperEffect(timestamp);
        }
        if (elapsed >= HELPER_PHASE_DURATIONS.cast) {
            setSummonPhase('exit', timestamp);
        }
    } else if (summon.phase === 'exit' && elapsed >= HELPER_PHASE_DURATIONS.exit) {
        summon.exitComplete = true;
    }

    if (summon.exitComplete && !summon.effectActive) {
        finishSummon();
    }
}

function summonHelper() {
    if (!state.isRunning || state.isPaused || !state.summonReady || state.summon.active) return;

    const now = performance.now();
    const helper = HELPERS[state.nextHelperIndex];
    state.summonReady = false;
    state.summonEnergy = 0;
    state.nextHelperIndex = (state.nextHelperIndex + 1) % HELPERS.length;
    state.isPaused = true;
    state.keysPressed = {};
    state.mobileLeft = false;
    state.mobileRight = false;
    state.lastSpawnTime = now;
    gameArea.classList.add('summon-paused');
    state.summon = {
        active: true,
        phase: 'enter',
        phaseStartedAt: now,
        effectEndsAt: 0,
        effectActive: false,
        effectApplied: false,
        exitComplete: false,
        helper,
        helperEl: createHelperElement(helper),
    };
    updateHUD();
}

// ===== Difficulty Scaling =====
function updateDifficulty() {
    const newLevel = Math.floor(state.score / LEVEL_UP_SCORE) + 1;
    if (newLevel > state.level) {
        state.level = newLevel;
        playLevelUpSound();
        // Show level up effect
        showFloatText(gameArea.clientWidth / 2, gameArea.clientHeight / 2, `⭐ 第${newLevel}关！`, 'good');
    } else if (newLevel < state.level) {
        // 扣分后允许关卡随当前分数回落，避免界面显示与规则不一致。
        state.level = newLevel;
    }

    // Increase fall speed gradually
    state.fallSpeed = Math.min(
        MAX_FALL_SPEED,
        INITIAL_FALL_SPEED + (state.level - 1) * 0.4
    );

    // Decrease spawn interval (faster spawning)
    state.spawnInterval = Math.max(
        MIN_SPAWN_INTERVAL,
        INITIAL_SPAWN_INTERVAL - (state.level - 1) * 80
    );
}

// ===== Item Spawning =====
function spawnItem() {
    if (!state.isRunning) return;

    const areaWidth = gameArea.clientWidth;
    // 65% chance good item, 35% chance bad item
    const isGood = Math.random() < 0.65;
    const itemPool = isGood ? GOOD_ITEMS : BAD_ITEMS;
    const itemData = itemPool[Math.floor(Math.random() * itemPool.length)];

    // Create DOM element
    const el = document.createElement('div');
    el.className = `falling-item ${isGood ? 'good' : 'bad'}`;
    el.textContent = itemData.emoji;

    // Random X position (keep within bounds)
    const x = Math.random() * (areaWidth - ITEM_SIZE);
    el.style.left = x + 'px';
    el.style.top = '-40px';

    gameArea.appendChild(el);

    // Track in state
    const item = {
        el: el,
        x: x,
        y: -40,
        isGood: isGood,
        data: itemData,
        speed: state.fallSpeed + (Math.random() * 0.8 - 0.4), // slight speed variation
        harmlessUntil: !isGood && state.frozenBadUntil > performance.now()
            ? state.frozenBadUntil
            : 0,
    };
    if (item.harmlessUntil) el.classList.add('frozen-bad');
    state.items.push(item);
}

// ===== Collision Detection =====
function checkCollision(item) {
    // Simple AABB collision
    const capyLeft = state.capyX;
    const capyRight = state.capyX + CAPY_WIDTH;
    const capyTop = gameArea.clientHeight - CAPY_HEIGHT - 10;
    const capyBottom = gameArea.clientHeight - 10;

    const itemLeft = item.x;
    const itemRight = item.x + ITEM_SIZE;
    const itemTop = item.y;
    const itemBottom = item.y + ITEM_SIZE;

    return (
        capyLeft < itemRight &&
        capyRight > itemLeft &&
        capyTop < itemBottom &&
        capyBottom > itemTop
    );
}

// ===== Visual Effects =====
function showFloatText(x, y, text, type) {
    const el = document.createElement('div');
    el.className = `float-text ${type}`;
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    gameArea.appendChild(el);

    // Remove after animation
    setTimeout(() => el.remove(), 1000);
}

function spawnParticles(x, y, color, count = 6) {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.background = color;

        // Random direction
        const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
        const distance = 30 + Math.random() * 30;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        particle.style.setProperty('--dx', dx + 'px');
        particle.style.setProperty('--dy', dy + 'px');

        gameArea.appendChild(particle);
        setTimeout(() => particle.remove(), 600);
    }
}

function flashScreen(type) {
    gameArea.classList.remove('flash-good', 'flash-bad');
    // Force reflow
    void gameArea.offsetWidth;
    gameArea.classList.add(type === 'good' ? 'flash-good' : 'flash-bad');
    setTimeout(() => gameArea.classList.remove('flash-good', 'flash-bad'), 300);
}

// ===== Input Handling =====

// Keyboard
document.addEventListener('keydown', (e) => {
    state.keysPressed[e.key] = true;

    if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        summonHelper();
    }
    
    // Prevent page scroll with arrow keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    state.keysPressed[e.key] = false;
});

// Mobile controls
btnLeft.addEventListener('touchstart', (e) => {
    e.preventDefault();
    state.mobileLeft = true;
});
btnLeft.addEventListener('touchend', (e) => {
    e.preventDefault();
    state.mobileLeft = false;
});
btnLeft.addEventListener('mousedown', () => state.mobileLeft = true);
btnLeft.addEventListener('mouseup', () => state.mobileLeft = false);
btnLeft.addEventListener('mouseleave', () => state.mobileLeft = false);

btnRight.addEventListener('touchstart', (e) => {
    e.preventDefault();
    state.mobileRight = true;
});
btnRight.addEventListener('touchend', (e) => {
    e.preventDefault();
    state.mobileRight = false;
});
btnRight.addEventListener('mousedown', () => state.mobileRight = true);
btnRight.addEventListener('mouseup', () => state.mobileRight = false);
btnRight.addEventListener('mouseleave', () => state.mobileRight = false);

// Touch on game area (left/right half)
gameArea.addEventListener('touchstart', (e) => {
    if (!state.isRunning) return;
    const touch = e.touches[0];
    const areaRect = gameArea.getBoundingClientRect();
    const touchX = touch.clientX - areaRect.left;
    
    if (touchX < areaRect.width / 2) {
        state.mobileLeft = true;
    } else {
        state.mobileRight = true;
    }
});

gameArea.addEventListener('touchend', () => {
    state.mobileLeft = false;
    state.mobileRight = false;
});

gameArea.addEventListener('touchcancel', () => {
    state.mobileLeft = false;
    state.mobileRight = false;
});

/** Process input and update capybara position */
function processInput() {
    const areaWidth = gameArea.clientWidth;
    const moveSpeed = CAPY_SPEED * state.playerSpeedMultiplier;

    // Left movement
    if (state.keysPressed['ArrowLeft'] || state.keysPressed['a'] || state.keysPressed['A'] || state.mobileLeft) {
        state.capyX -= moveSpeed;
    }

    // Right movement
    if (state.keysPressed['ArrowRight'] || state.keysPressed['d'] || state.keysPressed['D'] || state.mobileRight) {
        state.capyX += moveSpeed;
    }

    // Clamp position within game area
    state.capyX = Math.max(0, Math.min(areaWidth - CAPY_WIDTH, state.capyX));

    // Update DOM
    capybara.style.left = state.capyX + 'px';
}

// ===== Item Handling =====
function handleItemCatch(item) {
    if (item.isGood) {
        // Good item caught!
        state.score += item.data.points;
        addSummonEnergy(item.data.points);
        playCatchSound();
        flashScreen('good');
        showFloatText(item.x, item.y, `+${item.data.points}`, 'good');
        spawnParticles(item.x + ITEM_SIZE / 2, item.y + ITEM_SIZE / 2, '#FFB6C1', 5);

        // Happy animation on capybara
        capybara.classList.remove('happy');
        void capybara.offsetWidth;
        capybara.classList.add('happy');
        setTimeout(() => capybara.classList.remove('happy'), 300);

        updateDifficulty();
    } else {
        if (item.harmlessUntil > performance.now()) {
            playCatchSound();
            flashScreen('good');
            showFloatText(item.x, item.y, '🧊 安全通过', 'good');
            return;
        }

        // Bad item hit!
        const damage = item.data.damage || 1;
        const scorePenalty = DAMAGE_SCORE_PENALTY * damage;
        state.lives = Math.max(0, state.lives - damage);
        state.score = Math.max(0, state.score - scorePenalty);
        updateDifficulty();
        playHurtSound();
        flashScreen('bad');
        showFloatText(item.x, item.y, `-${scorePenalty}分 ${damage > 1 ? `-${damage} 💔` : '-1 💔'}`, 'bad');
        spawnParticles(item.x + ITEM_SIZE / 2, item.y + ITEM_SIZE / 2, '#FF6B6B', 6);

        // Shake animation on capybara
        capybara.classList.remove('hit');
        void capybara.offsetWidth;
        capybara.classList.add('hit');
        setTimeout(() => capybara.classList.remove('hit'), 400);

        // Check game over
        if (state.lives <= 0) {
            gameOver();
            return;
        }
    }

    updateHUD();
}

// ===== Game Over =====
function gameOver() {
    state.isRunning = false;
    if (state.summon.effectActive) finishHelperEffect();
    if (state.summon.active) finishSummon();
    playGameOverSound();

    // Cancel animation frame
    if (state.animFrameId) {
        cancelAnimationFrame(state.animFrameId);
        state.animFrameId = null;
    }

    // Show game over screen with a short delay
    setTimeout(() => {
        finalScoreEl.textContent = state.score;
        finalLevelEl.textContent = `你到达了第${state.level}关！`;
        
        // Random cute message
        const msg = GAMEOVER_MESSAGES[Math.floor(Math.random() * GAMEOVER_MESSAGES.length)];
        gameoverMsgEl.textContent = msg;

        showScreen(gameoverScreen);
        submitScoreAndRefreshLeaderboard();
    }, 500);
}

// ===== Main Game Loop =====
function gameLoop(timestamp) {
    if (!state.isRunning) return;

    const deltaTime = timestamp - state.lastTime;
    state.lastTime = timestamp;

    if (state.isPaused) {
        // 召唤进场期间只播放帮手动画，游戏世界保持静止。
        updateSummon(timestamp);
        state.animFrameId = requestAnimationFrame(gameLoop);
        return;
    }

    // Process input
    processInput();

    // Spawn items based on interval
    if (timestamp - state.lastSpawnTime >= state.spawnInterval) {
        spawnItem();
        state.lastSpawnTime = timestamp;
    }

    // Update falling items
    const areaHeight = gameArea.clientHeight;
    updateFrozenBadItems(timestamp);

    for (let i = state.items.length - 1; i >= 0; i--) {
        const item = state.items[i];

        // Move item down
        item.y += item.speed;
        item.el.style.top = item.y + 'px';

        // Check collision with capybara
        if (checkCollision(item)) {
            handleItemCatch(item);
            item.el.remove();
            state.items.splice(i, 1);
            continue;
        }

        // Check if item fell off screen
        if (item.y > areaHeight + 40) {
            item.el.remove();
            state.items.splice(i, 1);
        }
    }

    // 帮手拥有独立的进场、施法、效果、退场状态，不会干扰接物碰撞。
    updateSummon(timestamp);

    // Continue loop
    state.animFrameId = requestAnimationFrame(gameLoop);
}

// ===== Event Listeners =====
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
loginBtn.addEventListener('click', handleLogin);
accountOptions.forEach(option => {
    option.addEventListener('click', () => selectAccount(option.dataset.accountId));
});
passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
});

// Handle window resize - reposition capybara
window.addEventListener('resize', () => {
    if (state.isRunning) {
        const areaWidth = gameArea.clientWidth;
        state.capyX = Math.min(state.capyX, areaWidth - CAPY_WIDTH);
        capybara.style.left = state.capyX + 'px';
    }
});

// Prevent context menu on long press (mobile)
document.addEventListener('contextmenu', (e) => {
    if (state.isRunning) {
        e.preventDefault();
    }
});

summonBtn.addEventListener('click', summonHelper);

// ===== Initial Setup =====
// Show start screen
showScreen(startScreen);
startBtn.disabled = true;
restoreSession();
console.log('🧋 水豚奶茶接接乐加载完成！祝你玩得开心～');
