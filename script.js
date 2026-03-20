// Global Configuration
const API_KEY = 'AIzaSyDisorB5SFZscudEe6JJseoaWB37TipQM0';
// API endpoints are now handled via auto-fallback in callGeminiAPI logic

// State Management
let currentLanguage = 'en';
let searchHistory = JSON.parse(localStorage.getItem('arshad_school_history')) || [];
let selectedImageData = null;

// DOM Elements
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const imageUpload = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-all-history');
const langEnBtn = document.getElementById('lang-en');
const langUrBtn = document.getElementById('lang-ur');
const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const loadingOverlay = document.getElementById('loading-overlay');
const welcomeScreen = document.getElementById('welcome-screen');
const suggestionBtns = document.querySelectorAll('.suggestion-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateHistoryUI();

    // Suggestion buttons click handler
    suggestionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            userInput.value = btn.innerText;
            handleSendMessage();
        });
    });
});

// AI Persona System Prompt
const getSystemPrompt = () => {
    return `You are a friendly and intelligent teacher helping a 10th-grade student at Arshad Excellence School. 
    Your name is AI Teacher. You were created to help students by Muneeb Arshad.
    
    Rules for your behavior:
    - Explain everything step-by-step.
    - Use very simple words and avoid difficult vocabulary.
    - Give real-life examples whenever possible to make concepts clear.
    - Keep explanations short but very clear.
    - DO NOT just give the final answer — focus on the explanation so the student learns.
    - Be extremely friendly and encouraging, like a supportive teacher.
    
    If the question is Math or Science:
    - Solve it step-by-step.
    - Show relevant formulas.
    - Explain what happens in each step.
    
    If the question is theoretical:
    - Explain in simple sentences.
    - Use illustrative examples.
    
    Language:
    - If the user talks to you in Urdu or the context is Urdu, answer in simple Urdu (Roman Urdu is also fine if requested, but prefer script).
    - If English, answer in simple English.
    - Current Language Setting: ${currentLanguage}.
    
    Always end with a short summary and 1-2 positive emojis 😊.`;
};

// --- History Functions ---

function saveToHistory(query) {
    const historyItem = {
        id: Date.now(),
        query: query,
        timestamp: new Date().toLocaleString()
    };
    searchHistory.unshift(historyItem);
    // Keep only last 20 items
    if (searchHistory.length > 20) searchHistory.pop();

    localStorage.setItem('arshad_school_history', JSON.stringify(searchHistory));
    updateHistoryUI();
}

function updateHistoryUI() {
    if (searchHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-history">No history yet</div>';
        return;
    }

    historyList.innerHTML = searchHistory.map(item => `
        <div class="history-item" onclick="loadHistoryItem('${item.query}')">
            <span class="text" title="${item.query}">${item.query}</span>
            <button class="delete-history-btn" onclick="deleteHistoryItem(event, ${item.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function deleteHistoryItem(event, id) {
    event.stopPropagation();
    searchHistory = searchHistory.filter(item => item.id !== id);
    localStorage.setItem('arshad_school_history', JSON.stringify(searchHistory));
    updateHistoryUI();
}

function clearAllHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
        searchHistory = [];
        localStorage.setItem('arshad_school_history', JSON.stringify(searchHistory));
        updateHistoryUI();
    }
}

function loadHistoryItem(query) {
    userInput.value = query;
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
    }
}

// --- Chat Functions ---

function addMessage(text, type, imageUrl = null) {
    welcomeScreen.style.display = 'none';

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type === 'user' ? 'user-message' : 'ai-message'}`;

    if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.className = 'message-image';
        messageDiv.appendChild(img);
    }

    const textSpan = document.createElement('span');
    // Basic Markdown-ish formatting for line breaks and bold
    textSpan.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    messageDiv.appendChild(textSpan);

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function handleSendMessage() {
    const text = userInput.value.trim();
    if (!text && !selectedImageData) return;

    // Add user message to UI
    addMessage(text, 'user', selectedImageData?.preview);

    // Save to history (only text)
    if (text) saveToHistory(text);

    // Reset input
    userInput.value = '';
    userInput.style.height = 'auto';
    const imageDataToSend = selectedImageData?.base64;
    resetImagePreview();

    // Show loading
    loadingOverlay.style.display = 'flex';

    try {
        const response = await callGeminiAPI(text, imageDataToSend);
        addMessage(response, 'ai');
    } catch (error) {
        console.error("AI Error:", error);
        addMessage(`I'm sorry, I'm having trouble connecting to my brain. 
        <br><br><strong>Technical Reason:</strong> ${error.message}`, 'ai');
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

async function callGeminiAPI(prompt, base64Image) {
    const systemInstruction = getSystemPrompt();

    // Updated endpoints for March 2026
    const endpoints = [
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
    ];

    const requestBody = {
        contents: [{
            parts: [
                { text: systemInstruction + "\n\nUser Question: " + (prompt || "Explain the image.") }
            ]
        }]
    };

    if (base64Image) {
        requestBody.contents[0].parts.push({
            inline_data: {
                mime_type: "image/jpeg",
                data: base64Image
            }
        });
    }

    let errorReports = [];

    for (const endpoint of endpoints) {
        const modelName = endpoint.split('/models/')[1].split(':')[0];
        try {
            console.log(`Trying ${modelName}...`);
            const response = await fetch(`${endpoint}?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (response.ok) {
                if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                    return data.candidates[0].content.parts[0].text;
                }
            } else {
                const msg = data.error?.message || response.statusText;
                if (response.status === 429) {
                    throw new Error(`QUOTA_EXCEEDED: ${msg}`);
                }
                errorReports.push(`${modelName}: ${response.status} - ${msg}`);
                console.error(`Failed ${modelName}:`, data);
            }
        } catch (error) {
            if (error.message.includes('QUOTA_EXCEEDED')) throw error;
            errorReports.push(`${modelName}: Network Error`);
            console.error(`Network error for ${modelName}:`, error);
        }
    }

    throw new Error("Connection failed for all models:\n" + errorReports.join('\n'));
}

// --- Image Handling ---

imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result.split(',')[1];
            selectedImageData = {
                base64: base64,
                preview: event.target.result
            };
            imagePreview.src = event.target.result;
            imagePreviewContainer.style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    }
});

function resetImagePreview() {
    selectedImageData = null;
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
    imageUpload.value = '';
}

removeImageBtn.addEventListener('click', resetImagePreview);

// --- UI Event Listeners ---

userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
});

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

sendBtn.addEventListener('click', handleSendMessage);

// Sidebar Controls
toggleSidebarBtn.addEventListener('click', () => sidebar.classList.toggle('active'));
closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('active'));

// Language Switch
langEnBtn.addEventListener('click', () => {
    currentLanguage = 'en';
    langEnBtn.classList.add('active');
    langUrBtn.classList.remove('active');
    document.documentElement.setAttribute('lang', 'en');
    userInput.placeholder = "Ask your teacher a question...";
    // Update labels if needed
});

langUrBtn.addEventListener('click', () => {
    currentLanguage = 'ur';
    langUrBtn.classList.add('active');
    langEnBtn.classList.remove('active');
    document.documentElement.setAttribute('lang', 'ur');
    userInput.placeholder = "اپنے استاد سے سوال پوچھیں۔۔۔";
});

clearHistoryBtn.addEventListener('click', clearAllHistory);
