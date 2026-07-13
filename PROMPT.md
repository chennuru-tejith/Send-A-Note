# Prompt for Antigravity: LinkedIn AI Smart Writer

You are Antigravity, a senior Chrome Extension Developer and expert in React, TypeScript, and TailwindCSS. Your task is to build a production-ready, highly polished Chrome Extension named **LinkedIn AI Smart Writer** in this repository.

---

## 🚀 Objective
Develop a production-ready Chrome Extension (Manifest V3) that integrates naturally into LinkedIn and provides AI-generated personalized networking messages directly inside the LinkedIn interface. 

The extension must feel like an organic part of LinkedIn (using native-matching designs, colors, fonts, and responsiveness) so that users never have to leave LinkedIn or copy-paste messages.

---

## 🛠️ Tech Stack & Constraints
1. **Manifest Version**: Manifest V3
2. **Framework & Language**: React (18+) with TypeScript (Strict mode)
3. **Build Tool**: Vite (configured for Chrome Extension development with content scripts and background worker)
4. **Styling**: TailwindCSS (injected via Shadow DOM to prevent style leakage or pollution of LinkedIn's native styling)
5. **Storage**: Chrome Storage API (`chrome.storage.local` for preferences and API keys)
6. **No External Heavy Libraries**: No jQuery, no unnecessary NPM packages. Keep the bundle lightweight and high-performance.
7. **Architectural Guidelines**:
   - Feature-based structure: `/src/components`, `/src/hooks`, `/src/services`, `/src/content`, `/src/background`, `/src/utils`, `/src/types`, `/src/config`.
   - File size limits: Max 300–400 lines per file. Use small, reusable, and single-responsibility components.

---

## 📋 Phased Implementation Plan

Follow this step-by-step roadmap to implement the extension. Use **Planning Mode** (create `implementation_plan.md` first, get user approval, and track tasks in `task.md`).

### Phase 1: Project Scaffolding & Config
1. Initialize a Vite React TypeScript project in the current directory.
2. Configure TailwindCSS and PostCSS.
3. Create `manifest.json` conforming to Manifest V3:
   - Request necessary permissions: `storage`, `activeTab`.
   - Define background service worker (`background.ts`).
   - Define content scripts (`content.ts` or `content/index.tsx`) matching `https://*.linkedin.com/*`.
4. Configure Vite build script to bundle content scripts and the background worker correctly (e.g., using `vite-plugin-chrome-extension` or custom Rollup output options).
5. Set up ESLint and Prettier with strict rules.

### Phase 2: Reliable LinkedIn DOM Parser & Observer
1. Create a `ProfileParserService` to extract profile details from the DOM.
2. **Selector Strategy (Crucial)**: LinkedIn frequently updates class names. Never rely on dynamic class names.
   - Target semantic elements, ARIA labels (e.g., `aria-label`, `role="main"`), and stable selectors (e.g., `h1`, `section`).
   - Implement a fallback array of selectors for each data point.
3. Extract the following profile components when visiting a profile:
   - Personal Info: Name, Headline, Current Position, Company, Location, About.
   - Experience: Job titles, company names, descriptions, dates.
   - Education: Schools, degrees, fields of study.
   - Activity: Recent posts, featured items, comments (if visible in DOM).
   - Other details: Skills, Certifications, Recommendations, Languages, Mutual Connections.
4. Implement a local cache/debouncer to avoid repeated DOM parses as the user scrolls or navigates.

### Phase 3: Connection Request Assistant (Shadow DOM UI Injection)
1. Set up a `MutationObserver` in the content script targeting the modal container (e.g., `div[role="dialog"]` or `.artdeco-modal`).
2. Detect when the "Add a Note" modal opens during a "Connect" action.
3. **Shadow DOM Injection**: Inject a React component into the modal using a Shadow DOM. This isolates TailwindCSS styles so they do not conflict with LinkedIn's global styles.
4. Parse the current profile in the background using the parser from Phase 2.
5. UI Layout (Native LinkedIn Aesthetic):
   - Card container with rounded corners, matching light/dark mode colors, and typography (font family `system-ui, -apple-system, sans-serif`).
   - Dynamic Category Selector: Professional Networking, Mentorship, Career Guidance, Alumni, Founder, Custom Prompt, etc.
   - Message list displaying generated personalized snippets.
   - Character counter:
     - Detect account level: Free (limit 200 characters) vs. Premium (limit 300 characters).
     - Live validation showing remaining characters; block insertions that exceed limits.
   - "Insert" button: Programmatically insert the selected text directly into the modal's native textarea (`#custom-message` or similar target) and update its React/DOM state so LinkedIn registers the input. No copy-pasting.

### Phase 4: LinkedIn Chat Assistant
1. Inject the extension UI into the LinkedIn messaging window (`.msg-convo-wrapper` or similar container).
2. Set up an observer to detect active chat threads.
3. Extract:
   - Recipient name and profile link.
   - Last 5 visible messages in the DOM (to maintain conversation context).
4. Render an inline "AI Reply" control bar directly below or inside the chat input area.
5. Provide:
   - **Quick Prompts**: "Follow-up", "Polite Reminder", "Ask for Time", "Thank You", "Meeting Request", "Job Referral".
   - **Tone/Style Adjustments**: "Shorter", "Casual", "Professional", "Friendly", "Stronger CTA".
   - **Custom Input Prompt**: A text field allowing inputs like "Ask them to be a guest speaker" or "Pitch startup".
6. Generate and present response options. On click, programmatically insert the message into the active chat textarea and trigger a mock input event so LinkedIn's message input registers it.

### Phase 5: Background Worker & AI Service
1. Create a `BackgroundService` to handle communication between content scripts and the OpenAI API.
2. Maintain user settings and API credentials in `chrome.storage.local`. Encrypt the API key locally.
3. Build the LLM completion service:
   - Create system prompts that enforce the **AI Rules**:
     * Zero hallucination; reference only actual parsed profile details.
     * No exaggeration, overpraising, or generic templates ("I hope you're doing well").
     * Professional, natural, concise, and human-like tone.
   - Implement the **Smart Context Detection Engine** to tailor responses based on the recipient's role (Founder, Recruiter, Engineer, Student, etc.) and industry.
4. Implement retry logic and graceful error messaging (e.g., "API Key missing", "Rate limit exceeded") with a retry button in the UI.

### Phase 6: Settings, Customization & Polish
1. Implement a Chrome Extension Popup page (action popup) for general settings:
   - OpenAI API key input (validated on save).
   - Global user preferences: Default Tone (Professional, Friendly, Warm, Direct), Length (Short, Medium, Long), and Primary Purpose (Networking, Mentorship, Referral).
2. UI polishing: Add micro-animations, loading skeletons, and transition effects. Ensure full responsiveness and accessibility (ARIA labels, keyboard tab navigation).
3. Test compatibility across standard screens, different zoom levels, and both Light and Dark modes of LinkedIn.

---

## 🛡️ AI Generation Rules & Guardrails
- **No Templates**: Never output standard template phrases. Every message must mention a specific, unique data point extracted from the profile (e.g., a specific past company, university, project, or post topic).
- **Strict Limits**: Keep character counts strictly under the limit (200 for free LinkedIn, 300 for premium).
- **No Hallucinations**: If a section (like volunteer work or certifications) is empty, do not invent or assume details.
- **Natural Polish**: Avoid robotic or sales-oriented phrases. The output should sound like a well-researched, personalized message written by an experienced professional.

---

## 🧪 Verification & Testing Plan
Validate your changes using the following methods:
1. **Build Verification**: Run `npm run build` (or equivalent) to ensure Vite compiles the extension with zero TypeScript errors or ESLint warnings.
2. **Local Installation**: Load the unpacked `dist` directory into Chrome (`chrome://extensions/`) and verify the background service worker starts up correctly.
3. **LinkedIn Simulation/Live Testing**:
   - Verify that navigating profiles correctly triggers the profile parser.
   - Click "Connect" -> "Add a Note" and verify the extension card injects seamlessly into the modal, respects character limits, and inserts text directly on click.
   - Open a messaging thread and verify that context-aware suggestions load, quick prompts work, and text inserts successfully.
4. **Resilience Test**: Simulate element selector failure or API timeouts to ensure the page does not crash and displays helpful fallbacks.

---

## 🛠️ Git and Deployment Workflow
- Use **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `perf:`, `docs:`, `chore:`).
- Commit after completing each phase.
- Automatically push commits to the main/current branch on the repository. Do not force-push.
