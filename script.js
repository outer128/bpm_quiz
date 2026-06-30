// DOM要素の取得
const screens = {
    start: document.getElementById('start-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen')
};
const startBtn = document.getElementById('start-btn');
const playBtn = document.getElementById('play-btn');
const submitBtn = document.getElementById('submit-btn');
const retryBtn = document.getElementById('retry-btn');
const bpmInput = document.getElementById('bpm-input');
const questionNumberEl = document.getElementById('question-number');
const resultTableBody = document.querySelector('#result-table tbody');
const totalScoreEl = document.getElementById('total-score');
const ringEl = document.getElementById('ring');

// ゲーム状態
const TOTAL_QUESTIONS = 10;
let currentQuestion = 1;
let currentBPM = 120;
let results = []; // { correct: number, guessed: number }

// Web Audio API関連
let audioContext = null;
let isPlaying = false;
let nextNoteTime = 0.0;
let timerID;

// 初期化・イベントリスナー
startBtn.addEventListener('click', startGame);
playBtn.addEventListener('click', toggleMetronome);
submitBtn.addEventListener('click', submitAnswer);
retryBtn.addEventListener('click', resetGame);

// ゲーム開始
function startGame() {
    results = [];
    currentQuestion = 1;
    switchScreen('quiz');
    setupQuestion();
    
    // AudioContextの初期化
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// 画面の切り替え
function switchScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// 問題のセットアップ
function setupQuestion() {
    // 60から240の間でランダムなBPMを生成
    currentBPM = Math.floor(Math.random() * (240 - 60 + 1)) + 60;
    questionNumberEl.textContent = `Question ${currentQuestion} / ${TOTAL_QUESTIONS}`;
    bpmInput.value = '';
    bpmInput.focus();
    stopMetronome(); // 新しい問題の時は音を止める
}

// 解答の送信
function submitAnswer() {
    const guessedBPM = parseInt(bpmInput.value, 10);
    
    if (isNaN(guessedBPM) || guessedBPM < 1 || guessedBPM > 999) {
        alert('有効なBPMの数値を入力してください。');
        return;
    }

    results.push({
        correct: currentBPM,
        guessed: guessedBPM
    });

    stopMetronome();

    if (currentQuestion < TOTAL_QUESTIONS) {
        currentQuestion++;
        setupQuestion();
    } else {
        showResult();
    }
}

// 結果表示
function showResult() {
    switchScreen('result');
    resultTableBody.innerHTML = '';
    
    let totalDiff = 0;

    results.forEach((res, index) => {
        const diff = Math.abs(res.correct - res.guessed);
        totalDiff += diff;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${res.correct}</td>
            <td>${res.guessed}</td>
            <td style="color: ${diff === 0 ? '#00e5ff' : diff <= 10 ? '#4caf50' : '#ff5252'}">
                ${diff === 0 ? '±0' : '+' + diff}
            </td>
        `;
        resultTableBody.appendChild(row);
    });

    const averageDiff = (totalDiff / TOTAL_QUESTIONS).toFixed(1);
    totalScoreEl.innerHTML = `平均ズレ: <strong style="color: var(--accent-color); font-size: 1.5rem;">${averageDiff} BPM</strong>`;
}

// ゲームリセット
function resetGame() {
    switchScreen('start');
}



function nextNote() {
    const secondsPerBeat = 60.0 / currentBPM;
    nextNoteTime += secondsPerBeat;
}

function playNote(time) {
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    osc.frequency.value = 800; 
    osc.type = 'sine';

    gainNode.gain.setValueAtTime(1, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.start(time);
    osc.stop(time + 0.05);
}

function scheduler() {
    while (nextNoteTime < audioContext.currentTime + 0.1) {
        playNote(nextNoteTime);
        nextNote();
    }
    timerID = setTimeout(scheduler, 25.0);
}

function toggleMetronome() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    if (isPlaying) {
        stopMetronome();
    } else {
        isPlaying = true;
        nextNoteTime = audioContext.currentTime + 0.05;
        scheduler();
        
        // UIの変更
        playBtn.textContent = '■ 停止する';
        playBtn.classList.add('playing');
        ringEl.classList.add('playing');
        // BPMに合わせてリングのアニメーション速度を変更
        ringEl.style.animationDuration = `${60 / currentBPM}s`;
    }
}

function stopMetronome() {
    if (isPlaying) {
        clearTimeout(timerID);
        isPlaying = false;
        
        // UIの変更
        playBtn.textContent = '▶ 音を聴く';
        playBtn.classList.remove('playing');
        ringEl.classList.remove('playing');
    }
}
