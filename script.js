// Получаем элементы интерфейса
const fileInput = document.getElementById("fileInput");
const applyEffectButton = document.getElementById("applyEffect");
const downloadBtn = document.getElementById("downloadBtn");
const audioPlayer = document.getElementById("audioPlayer");

// Получаем слайдеры и значения
const distortionAmount = document.getElementById("distortionAmount");
const gainAmount = document.getElementById("gainAmount");
const distortionValue = document.getElementById("distortionValue");
const gainValue = document.getElementById("gainValue");

// Создаем контекст аудио
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioElement = null;
let distortion = null;
let gainNode = null;
let processedAudioBuffer = null;

// Обновляем значения при изменении слайдера
distortionAmount.addEventListener("input", () => {
    distortionValue.textContent = distortionAmount.value;
});

gainAmount.addEventListener("input", () => {
    gainValue.textContent = gainAmount.value;
});

// Функция для создания эффекта distortion с правильным клиппингом
function createDistortion(amount) {
    distortion = audioContext.createWaveShaper();
    distortion.curve = makeDistortionCurve(amount);  // Сила distortion будет зависеть от значения слайдера
    distortion.oversample = '4x';
}

// Функция для создания кривой distortion (клиппинг)
function makeDistortionCurve(amount) {
    const curve = new Float32Array(44100);
    const clippingLevel = Math.pow(2, amount / 10);  // Более высокая степень для сильного клиппинга
    for (let i = 0; i < 44100; i++) {
        let x = (i / 44100) * 2 - 1; // Обычная волна от -1 до 1
        if (x > clippingLevel) x = clippingLevel;
        if (x < -clippingLevel) x = -clippingLevel;
        curve[i] = x;
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

    const audioSource = audioContext.createMediaElementSource(audioElement);

    // Получаем значения слайдеров
    const distortionValue = distortionAmount.value;
    const gainValue = gainAmount.value;

    // Создаем усилитель (GainNode)
    gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(gainValue, audioContext.currentTime);  // Усиливаем сигнал

    // Создаем distortion эффект с параметрами слайдера
    createDistortion(distortionValue);

    // Подключаем цепочку: источник -> усилитель -> distortion -> выход в колонки
    audioSource.connect(gainNode);
    gainNode.connect(distortion);
    distortion.connect(audioContext.destination);

    // Воспроизводим аудио
    audioElement.play();

    // После применения эффекта — даём возможность скачать файл
    const bufferSource = audioContext.createBufferSource();
    const xhr = new XMLHttpRequest();
    xhr.open("GET", audioElement.src, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function() {
        audioContext.decodeAudioData(xhr.response, function(buffer) {
            processedAudioBuffer = buffer;

            // Подключаем обработанный аудио-источник к цепочке
            bufferSource.buffer = processedAudioBuffer;
            bufferSource.connect(gainNode);
            gainNode.connect(distortion);
            distortion.connect(audioContext.destination);

            // Показать кнопку для скачивания
            downloadBtn.style.display = "inline-block";
        });
    };
    xhr.send();
});

// Функция для скачивания обработанного аудио
downloadBtn.addEventListener("click", function() {
    if (!processedAudioBuffer) return;

    const audioData = processedAudioBuffer;
    const wavData = encodeWav(audioData);

    const blob = new Blob([wavData], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "distorted_audio.wav";
    link.click();
});

// Функция для кодирования WAV
function encodeWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const dataLength = buffer.length * numChannels * (bitDepth / 8);
    const wavBuffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(wavBuffer);

    // RIFF header
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, "WAVE");

    // fmt chunk
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);

    // data chunk
    writeString(view, 36, "data");
    view.setUint32(40, dataLength, true);

    // Data
    const offset = 44;
    const bufferData = buffer.getChannelData(0); // Используем первый канал для примера
    let pos = offset;
    for (let i = 0; i < bufferData.length; i++) {
        const sample = Math.max(-1, Math.min(1, bufferData[i]));
        view.setInt16(pos, sample * 0x7FFF, true);
        pos += 2;
    }

    return wavBuffer;
}

// Функция для записи строки в DataView
function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
