// static/app.js
let mediaRecorder;
let audioChunks = [];
let speechSynthesis = window.speechSynthesis;
let speechUtterance = new SpeechSynthesisUtterance();

const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const speechOutput = document.getElementById('speechOutput');
const ollamaOutput = document.getElementById('ollamaOutput');

startButton.onclick = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');

        try {
            const response = await fetch('/recognize', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            speechOutput.textContent = "Speech recognized, receiving Ollama response...";
            ollamaOutput.textContent = '';

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let fullResponse = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[END]') {
                            break;
                        }
                        ollamaOutput.textContent += data;
                        ollamaOutput.scrollTop = ollamaOutput.scrollHeight;
                        fullResponse += data;
                    }
                }
            }
            
            // Speak the full response
            speechUtterance.text = fullResponse;
            speechSynthesis.speak(speechUtterance);
        } catch (error) {
            console.error('Error:', error);
            speechOutput.textContent = 'Error recognizing speech';
        }

        audioChunks = [];
    };

    mediaRecorder.start();
    startButton.disabled = true;
    stopButton.disabled = false;
};

stopButton.onclick = () => {
    mediaRecorder.stop();
    startButton.disabled = false;
    stopButton.disabled = true;
};

// Optional: Add controls for TTS
const pauseButton = document.createElement('button');
pauseButton.textContent = 'Pause TTS';
pauseButton.onclick = () => speechSynthesis.pause();

const resumeButton = document.createElement('button');
resumeButton.textContent = 'Resume TTS';
resumeButton.onclick = () => speechSynthesis.resume();

const cancelButton = document.createElement('button');
cancelButton.textContent = 'Stop TTS';
cancelButton.onclick = () => speechSynthesis.cancel();

document.body.appendChild(pauseButton);
document.body.appendChild(resumeButton);
document.body.appendChild(cancelButton);