// Получаем элементы интерфейса
const fileInput = document.getElementById("fileInput");
const applyEffectButton = document.getElementById("applyEffect");
const audioPlayer = document.getElementById("audioPlayer");

// Создаем контекст аудио
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioElement = null;
let distortion = null;

// Функция для создания эффекта distortion
function createDistortion() {
    distortion = audioContext.createWaveShaper();
    distortion.curve = makeDistortionCurve(400);  // Устанавливаем уровень эффекта
    distortion.oversample = '4x';
}

// Функция для создания кривой distortion
function makeDistortionCurve(amount) {
    const curve = new Float32Array(44100);
    const deg = Math.PI / 2;
    for (let i = 0; i < 44100; i++) {
        curve[i] = (i / 44100) * 2 - 1;
        curve[i] = (3 + amount) * curve[i] / (3 + amount * Math.abs(curve[i]));
    }
    return curve;
}

// Загружаем файл и воспроизводим его
fileInput.addEventListener("change", function() {
    const file = fileInput.files[0];
    if (file) {
        const audioURL = URL.createObjectURL(file);
        audioElement = new Audio(audioURL);
        audioPlayer.src = audioURL;
    }
});

// Применяем distortion и воспроизводим
applyEffectButton.addEventListener("click", function() {
    if (!audioElement) return;

    // Создаем источник аудио
    const audioSource = audioContext.createMediaElementSource(audioElement);

    // Создаем distortion эффект
    createDistortion();

    // Подключаем цепочку: источник -> distortion -> выход в колонки
    audioSource.connect(distortion);
    distortion.connect(audioContext.destination);

    // Воспроизводим аудио
    audioElement.play();
});
