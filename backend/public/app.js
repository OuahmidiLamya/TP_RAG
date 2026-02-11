/**
 * Chat IA avec RAG - Frontend JavaScript
 * UI handling and API communication
 */

const input = document.getElementById('userInput');
const messages = document.getElementById('messages');
const sendBtn = document.getElementById('sendBtn');
const sendIcon = document.getElementById('sendIcon');
const sendText = document.getElementById('sendText');

function showTypingIndicator() {
  const typingHtml = `
    <div id="typing-indicator" class="message ai-message">
      <div class="message-content">
        <i class="fas fa-robot"></i>
        <span>IA reflechit</span>
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>
  `;
  messages.innerHTML += typingHtml;
  scrollToBottom();
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.remove();
  }
}

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function clearWelcomeMessage() {
  const welcomeMessage = messages.querySelector('.welcome-message');
  if (welcomeMessage) {
    messages.innerHTML = '';
  }
}

function addUserMessage(message) {
  const userMessageHtml = `
    <div class="message user-message">
      <div class="message-content">
        <i class="fas fa-user"></i>
        <div class="text">${message}</div>
      </div>
    </div>
  `;
  messages.innerHTML += userMessageHtml;
}

function addAIResponse(data) {
  let html = `
    <div class="message ai-message">
      <div class="message-content">
        <i class="fas fa-robot"></i>
        <div class="text">${data.answer}</div>
      </div>
  `;

  if (data.sources && data.sources.length > 0) {
    html += `
      <div class="sources-box">
        <div class="sources-header">
          <i class="fas fa-book-open"></i>
          <span>Sources consultees</span>
        </div>
        <ul class="sources-list">
    `;

    data.sources.forEach((source) => {
      html += `
        <li class="source-item">
          <i class="fas fa-file-alt"></i>
          <span><em>${source.title}</em> - ${source.author}, ${source.date}</span>
          <span class="score">${source.score}%</span>
        </li>
      `;
    });

    html += `</ul></div>`;
  } else if (data.found === false) {
    html += `
      <div class="no-sources">
        <i class="fas fa-exclamation-triangle"></i>
        <span>Aucune source pertinente trouvee</span>
      </div>
    `;
  }

  html += '</div>';
  messages.innerHTML += html;
}

function addErrorMessage(errorMessage = 'Erreur de communication avec le serveur') {
  const errorHtml = `
    <div class="message error-message">
      <div class="message-content">
        <i class="fas fa-exclamation-circle"></i>
        <span>${errorMessage}</span>
      </div>
    </div>
  `;
  messages.innerHTML += errorHtml;
}

function setUIState(disabled) {
  input.disabled = disabled;
  sendBtn.disabled = disabled;
  if (disabled) {
    sendIcon.className = 'fas fa-spinner fa-spin';
  } else {
    sendIcon.className = 'fas fa-paper-plane';
  }
}

async function sendMessageToAPI(message) {
  try {
    const response = await fetch('/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question: message })
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

async function sendMessage() {
  const message = input.value.trim();

  if (!message) {
    return;
  }

  setUIState(true);
  clearWelcomeMessage();
  addUserMessage(message);

  input.value = '';
  showTypingIndicator();

  try {
    const data = await sendMessageToAPI(message);
    removeTypingIndicator();
    addAIResponse(data);
  } catch (error) {
    removeTypingIndicator();
    addErrorMessage();
  } finally {
    setUIState(false);
    scrollToBottom();
    input.focus();
  }
}

function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function initializeApp() {
  input.addEventListener('keydown', handleKeyPress);
  sendBtn.addEventListener('click', sendMessage);
  input.focus();
  console.log('Chat IA initialized');
}

document.addEventListener('DOMContentLoaded', initializeApp);
