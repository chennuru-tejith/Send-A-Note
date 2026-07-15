import { OpenAiService } from '../services/openai';
import { getPreferences } from '../services/storage';
import { GenerationRequest, ScheduledMessage } from '../types';

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'GENERATE_MESSAGES') {
    const request = message.request as GenerationRequest;
    
    // Load preferences from storage to get the API key
    getPreferences()
      .then((prefs) => {
        const mergedRequest = {
          ...request,
          preferences: {
            ...prefs,
            // Override with local requests if present
            openAiKey: prefs.openAiKey || request.preferences?.openAiKey || '',
          }
        };

        if (!mergedRequest.preferences.openAiKey) {
          sendResponse({ success: false, error: 'OpenAI API Key is missing. Click the extension icon in the toolbar to enter your key.' });
          return;
        }

        return OpenAiService.generateSuggestions(mergedRequest);
      })
      .then((suggestions) => {
        if (suggestions) {
          sendResponse({ success: true, suggestions });
        }
      })
      .catch((error) => {
        console.error('Background worker generation failed:', error);
        sendResponse({ success: false, error: error.message || 'Failed to generate message suggestions.' });
      });

    return true; // Keeps the message channel open for async response
  }
});

// --- Scheduled Messages Alarm Dispatcher ---

// Helper to fetch scheduled messages
const getScheduledMessages = (): Promise<ScheduledMessage[]> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(['scheduled_messages'], (result) => {
      resolve(result.scheduled_messages || []);
    });
  });
};

// Helper to update status of a message
const updateMessageStatus = async (id: string, status: 'pending' | 'sending' | 'sent' | 'failed', error?: string) => {
  const messages = await getScheduledMessages();
  const updated = messages.map(m => m.id === id ? { ...m, status, error } : m);
  await chrome.storage.local.set({ scheduled_messages: updated });
};

// Wait for tab loading states
const waitForTabComplete = (tabId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Tab load timeout (15s)'));
    }, 15000);

    const listener = (changeTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
};

// Dispatch a single scheduled message via background tab automation
const sendScheduledMessage = async (msg: ScheduledMessage) => {
  let tab: chrome.tabs.Tab | null = null;
  try {
    // 1. Open conversation in background tab (inactive)
    tab = await chrome.tabs.create({ url: msg.conversationUrl, active: false });
    if (!tab || !tab.id) throw new Error('Failed to create tab');

    // 2. Wait for page to fully load
    await waitForTabComplete(tab.id);

    // 3. Inject message insertion and send trigger script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (messageText: string) => {
        const editor = document.querySelector('.msg-form__contenteditable, div[contenteditable="true"]') as HTMLDivElement | null;
        const sendButton = document.querySelector('.msg-form__send-button, button[type="submit"]') as HTMLButtonElement | null;
        
        if (!editor || !sendButton) return { success: false, error: 'LinkedIn chat container could not be found' };

        editor.focus();
        editor.innerHTML = `<p>${messageText}</p>`;
        editor.dispatchEvent(new Event('input', { bubbles: true }));

        setTimeout(() => {
          sendButton.click();
        }, 500);

        return { success: true };
      },
      args: [msg.messageText]
    });

    const result = results?.[0]?.result as { success: boolean; error?: string } | undefined;
    if (!result || !result.success) {
      throw new Error(result?.error || 'Failed to dispatch message inside tab');
    }

    // 4. Wait for network send to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 5. Update storage state
    await updateMessageStatus(msg.id, 'sent');

    // 6. Notify user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Scheduled Message Sent',
      message: `Successfully sent message to ${msg.recipientName}.`,
      priority: 2
    });

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Scheduled message failed for ${msg.recipientName}:`, err);
    await updateMessageStatus(msg.id, 'failed', errMsg);
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Scheduled Message Failed',
      message: `Failed to send to ${msg.recipientName}: ${errMsg}`,
      priority: 2
    });
  } finally {
    if (tab && tab.id) {
      chrome.tabs.remove(tab.id).catch(() => {});
    }
  }
};

// Check all pending scheduled messages
const checkAndSendScheduledMessages = async () => {
  const messages = await getScheduledMessages();
  const now = Date.now();
  const due = messages.filter(m => m.status === 'pending' && m.scheduledTime <= now);

  for (const msg of due) {
    // Instantly mark status to prevent concurrent runs on subsequent alarms
    await updateMessageStatus(msg.id, 'sending');
    await sendScheduledMessage(msg);
  }
};

// Alarms setup
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('check_scheduled_messages', { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('check_scheduled_messages', { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'check_scheduled_messages') {
    checkAndSendScheduledMessages();
  }
});
