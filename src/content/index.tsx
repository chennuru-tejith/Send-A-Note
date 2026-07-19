import { createRoot } from 'react-dom/client';
import { ProfileParser } from './parser';
import { ConnectAssistant } from '../components/ConnectAssistant';
import { ChatAssistant } from '../components/ChatAssistant';
import { ProfileDetails } from '../types';
import styles from './content.css?inline';

// Global configurations
const CONNECT_HOST_ID = 'linkedin-ai-writer-connect-host';
const CHAT_HOST_ID = 'linkedin-ai-writer-chat-host';

// Helper to inject our styles inside Shadow DOM
const createShadowHost = (id: string): { host: HTMLDivElement; root: ShadowRoot } => {
  // Remove existing host if any
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const host = document.createElement('div');
  host.id = id;
  const root = host.attachShadow({ mode: 'open' });

  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  root.appendChild(styleTag);

  return { host, root };
};

// --- Connection Request Modal Handler ---
const handleConnectModal = (textarea: HTMLTextAreaElement) => {
  // Locate the parent modal container to insert our card
  const modalContainer = textarea.closest('.artdeco-modal__content') || textarea.parentElement;
  if (!modalContainer) return;

  // Prevent multiple injections
  if (modalContainer.querySelector(`#${CONNECT_HOST_ID}`)) return;

  const { host, root } = createShadowHost(CONNECT_HOST_ID);
  
  // Append after the textarea wrapper
  textarea.parentElement?.appendChild(host);

  // Parse current profile page
  let profile: ProfileDetails;
  try {
    profile = ProfileParser.parseProfile();
  } catch (err) {
    console.error('Failed to parse profile:', err);
    profile = {
      name: 'LinkedIn Member',
      headline: '',
      experience: [],
      education: [],
      skills: []
    };
  }

  const container = document.createElement('div');
  container.className = 'mt-3 relative z-50';
  root.appendChild(container);

  const onClose = () => {
    host.remove();
  };

  const reactRoot = createRoot(container);
  reactRoot.render(
    <ConnectAssistant
      profile={profile}
      nativeTextarea={textarea}
      onClose={onClose}
    />
  );
};

// --- Message Chat Handler ---
const handleChatWindow = (chatForm: HTMLElement) => {
  // Find the actual input text container (LinkedIn uses a contenteditable div)
  const editor = chatForm.querySelector('.msg-form__contenteditable, div[contenteditable="true"]') as HTMLDivElement | null;
  if (!editor) return;

  // Parse recipient details from chat window header
  // Under .msg-convo-wrapper, find the lockup title (name) and subtitle (headline)
  const threadWrapper = chatForm.closest('.msg-convo-wrapper, [class*="msg-convo"]');
  let recipientName = 'LinkedIn Connection';
  let recipientHeadline = '';

  if (threadWrapper) {
    let nameEl = threadWrapper.querySelector('.msg-entity-lockup__title, [class*="entity-lockup__title"]');
    if (!nameEl) {
      nameEl = threadWrapper.querySelector('a[href*="/in/"]');
    }
    const headlineEl = threadWrapper.querySelector('.msg-entity-lockup__subtitle, [class*="entity-lockup__subtitle"]');
    
    if (nameEl && nameEl.textContent) {
      recipientName = nameEl.textContent.trim().split('\n')[0].replace(/\s+/g, ' ');
    }
    if (headlineEl && headlineEl.textContent) {
      recipientHeadline = headlineEl.textContent.trim().replace(/\s+/g, ' ');
    }
  }

  // Check if there is already an active host injected inside this form
  const existingHost = chatForm.querySelector(`#${CHAT_HOST_ID}`) as HTMLElement | null;
  if (existingHost) {
    const currentRecipient = existingHost.getAttribute('data-recipient');
    if (currentRecipient === recipientName) {
      return; // Already injected for this recipient, skip
    } else {
      existingHost.remove(); // Recipient changed! Clear old container to trigger re-render
    }
  }

  const { host, root } = createShadowHost(CHAT_HOST_ID);
  
  // Tag host with current recipient name to detect conversation changes
  host.setAttribute('data-recipient', recipientName);
  
  // Insert before the input container form
  chatForm.insertBefore(host, chatForm.firstChild);

  const profile: ProfileDetails = {
    name: recipientName,
    headline: recipientHeadline,
    experience: [],
    education: [],
    skills: []
  };

  // Extract recent messages from the DOM
  const chatHistory: string[] = [];
  if (threadWrapper) {
    const messages = Array.from(threadWrapper.querySelectorAll('.msg-s-event-listitem__body, [class*="msg-s-event-listitem__body"]'));
    // Get last 5 messages, reversed (most recent first)
    const recentMsgs = messages
      .slice(-5)
      .map(el => el.textContent?.trim() || '')
      .filter(t => t.length > 0)
      .reverse();
    chatHistory.push(...recentMsgs);
  }

  const container = document.createElement('div');
  container.className = 'w-full mb-2';
  root.appendChild(container);

  const onInsertMessage = (text: string) => {
    editor.focus();

    try {
      // Clear current content
      editor.innerHTML = '';

      // Force range selection inside editor to trigger framework state sync
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);

      // Use insertText command to mimic native typing so React state stays updated
      const success = document.execCommand('insertText', false, text);
      if (!success) {
        throw new Error('execCommand failed');
      }
    } catch (e) {
      console.warn('execCommand failed, falling back to direct DOM insertion:', e);
      editor.innerHTML = `<p>${text}</p>`;
    }

    // Fire input event to make absolutely sure the UI send button lights up
    const inputEvent = new Event('input', { bubbles: true });
    editor.dispatchEvent(inputEvent);
  };

  const reactRoot = createRoot(container);
  reactRoot.render(
    <ChatAssistant
      profile={profile}
      nativeTextarea={editor}
      chatHistory={chatHistory}
      onInsertMessage={onInsertMessage}
    />
  );
};

// --- DOM Observer & Injection Setup ---
const initializeObserver = () => {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // 1. Look for Connection Modal Textarea
        const customMessageTextarea = document.querySelector('textarea#custom-message') as HTMLTextAreaElement | null;
        if (customMessageTextarea) {
          handleConnectModal(customMessageTextarea);
        }

        // 2. Look for messaging forms
        const chatForms = Array.from(document.querySelectorAll('.msg-form, form.msg-form__container')) as HTMLElement[];
        for (const form of chatForms) {
          handleChatWindow(form);
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
};

// Start observer
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeObserver);
} else {
  initializeObserver();
}
