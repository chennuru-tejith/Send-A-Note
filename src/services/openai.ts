import { GenerationRequest, ProfileDetails } from '../types';

export class OpenAiService {
  private static serializeProfile(profile: ProfileDetails): string {
    const expStr = profile.experience
      .map(e => `- ${e.title} at ${e.company}${e.duration ? ` (${e.duration})` : ''}`)
      .join('\n');
    const eduStr = profile.education
      .map(e => `- ${e.school}${e.degree ? `, ${e.degree}` : ''}`)
      .join('\n');
    const skillsStr = profile.skills.join(', ');

    return `
Name: ${profile.name}
Headline: ${profile.headline}
Current Company: ${profile.company}
Current Position: ${profile.currentPosition}
Location: ${profile.location || 'Unknown'}
About: ${profile.about || 'N/A'}

Experience:
${expStr || 'N/A'}

Education:
${eduStr || 'N/A'}

Skills:
${skillsStr || 'N/A'}
`.trim();
  }

  public static async generateSuggestions(request: GenerationRequest): Promise<string[]> {
    const { type, profile, category, customPrompt, chatHistory, preferences } = request;
    const apiKey = preferences.openAiKey;

    if (!apiKey) {
      throw new Error('OpenAI API Key is missing. Please add it in the extension settings.');
    }

    const maxChars = preferences.isPremium ? 300 : 200;
    const serializedProfile = this.serializeProfile(profile);

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'connection') {
      systemPrompt = `
You are a elite professional copywriter specializing in LinkedIn outreach.
Your task is to write highly personalized, high-converting, natural-sounding LinkedIn connection request messages.

CRITICAL RULES:
1. Under NO circumstances exceed the absolute maximum character limit of ${maxChars} characters (including spaces). Keep it strictly under ${maxChars}.
2. Never use template greetings like "I hope you are doing well" or generic phrases like "I'd like to connect with you".
3. Never exaggerate, hallucinate details, or overpraise the user. Sound confident, authentic, and human.
4. Reference SPECIFIC, concrete details from their profile (e.g., their transition from consulting, their work at a specific company, or their studies at a university).
5. Always output exactly three (3) distinct, high-quality, personalized connection note suggestions, separated by double newlines. Do not number them.
`.trim();

      userPrompt = `
Here is the LinkedIn profile of the person I want to connect with:
---
${serializedProfile}
---

Outreach Context/Category: ${category || 'General Professional Networking'}
Default Tone Preference: ${preferences.defaultTone}
Default Length Preference: ${preferences.defaultLength} (Maximum limit: ${maxChars} characters)
${customPrompt ? `Additional Custom Instruction: "${customPrompt}"` : ''}

Generate 3 unique, personalized connection request notes that match the context and tone.
Remember: Under ${maxChars} characters each. Focus on their background and why we should connect. No placeholders.
`.trim();
    } else {
      // Chat message generation
      const historyStr = chatHistory && chatHistory.length > 0
        ? chatHistory.map(msg => `- ${msg}`).join('\n')
        : 'No previous messages visible.';

      systemPrompt = `
You are a highly skilled professional assistant helping to draft replies for LinkedIn messages.
Your task is to write replies that sound human, confident, concise, and professional.

CRITICAL RULES:
1. Never sound robotic or salesy.
2. Reference the active conversation history and/or their profile details if relevant.
3. Keep it brief and contextual. Focus on a clear next step (e.g. scheduling a call, asking a question, thanking them).
4. Output exactly three (3) distinct reply suggestions, separated by double newlines. Do not number them.
`.trim();

      userPrompt = `
Here is the profile details of the recipient:
---
${serializedProfile}
---

Recent Chat History (from last to first):
${historyStr}

Desired Action/Intent: ${category || 'Reply to Last Message'}
Default Tone Preference: ${preferences.defaultTone}
${customPrompt ? `Additional Custom Instruction: "${customPrompt}"` : ''}

Generate 3 unique, personalized chat reply options. Focus on the recipient's background and conversation context. No placeholders.
`.trim();
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Lightweight, fast and highly capable for copywriting tasks
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.choices[0]?.message?.content || '';

      // Parse output into suggestions (split by double newlines, clean up numbers/bullets if AI included them anyway)
      const suggestions = text
        .split(/\n\n+/)
        .map((s: string) => s.replace(/^[1-3][\.\)-]\s*/, '').trim()) // remove numbering if present
        .filter((s: string) => s.length > 0)
        .slice(0, 3); // Return max 3 suggestions

      return suggestions;
    } catch (err: unknown) {
      console.error('Error generating suggestions:', err);
      throw err;
    }
  }
}
