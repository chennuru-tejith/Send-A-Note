import { ProfileDetails, ExperienceItem, EducationItem } from '../types';

/**
 * Robust LinkedIn DOM parser that avoids unstable CSS classes.
 * Relies on semantic structure, IDs, ARIA attributes, and header text.
 */
export class ProfileParser {
  private static findSectionByHeading(headingText: string): HTMLElement | null {
    // Find all H2s (LinkedIn uses H2s for section headings)
    const headings = Array.from(document.querySelectorAll('h2'));
    for (const heading of headings) {
      if (heading.textContent?.trim().toLowerCase().includes(headingText.toLowerCase())) {
        // Find the parent section or container
        let parent = heading.parentElement;
        while (parent && parent.tagName !== 'SECTION' && parent.tagName !== 'DIV') {
          parent = parent.parentElement;
        }
        if (parent) return parent as HTMLElement;
      }
    }

    // Try finding by ID as fallback
    const idMap: Record<string, string> = {
      about: 'about',
      experience: 'experience',
      education: 'education',
      skills: 'skills',
    };
    const mappedId = idMap[headingText.toLowerCase()];
    if (mappedId) {
      const anchor = document.getElementById(mappedId);
      if (anchor) {
        let parent = anchor.parentElement;
        while (parent && parent.tagName !== 'SECTION') {
          parent = parent.parentElement;
        }
        return (parent as HTMLElement) || anchor;
      }
    }

    return null;
  }

  public static parseProfile(): ProfileDetails {
    // 1. Parse Name
    // Fallbacks: h1 inside pv-text-details__left-panel, main section h1, or first h1 under role="main"
    let name = '';
    const nameSelectors = [
      'main h1',
      'h1.text-heading-xlarge',
      '.pv-text-details__left-panel h1',
      'h1'
    ];
    for (const sel of nameSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent) {
        const text = el.textContent.trim();
        // Exclude common header names or short texts
        if (text && text.length > 1 && !text.includes('LinkedIn')) {
          name = text.split('\n')[0].trim(); // Get first line if multi-line
          break;
        }
      }
    }

    // 2. Parse Headline
    let headline = '';
    const headlineSelectors = [
      'div.text-body-medium',
      '.pv-text-details__left-panel .text-body-medium',
      'main section [class*="text-body-medium"]',
      '.pv-shared-text-with-see-more'
    ];
    for (const sel of headlineSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent) {
        const text = el.textContent.trim();
        if (text && text.length > 5) {
          headline = text;
          break;
        }
      }
    }

    // 3. Parse Location
    let location = '';
    const locationSelectors = [
      'span.text-body-small.inline.t-black--light',
      '.pv-text-details__left-panel--secondary span',
      'main section [class*="text-body-small"]'
    ];
    for (const sel of locationSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent) {
        const text = el.textContent.trim();
        if (text && (text.includes(',') || text.length > 5) && !text.includes('connection')) {
          location = text;
          break;
        }
      }
    }

    // 4. Parse About
    let about = '';
    const aboutSection = this.findSectionByHeading('About');
    if (aboutSection) {
      // Look for see-more expansion or text block
      const textContainer = aboutSection.querySelector('.inline-show-more-text, [class*="show-more-text"]');
      if (textContainer && textContainer.textContent) {
        about = textContainer.textContent.replace('...see more', '').trim();
      } else {
        // Fallback to text content excluding the header
        about = aboutSection.textContent?.replace(/about/i, '').trim() || '';
      }
    }

    // 5. Parse Experience
    const experience: ExperienceItem[] = [];
    const expSection = this.findSectionByHeading('Experience');
    if (expSection) {
      // Find list items under experience
      const items = expSection.querySelectorAll('li.artdeco-list__item, li');
      items.forEach((item) => {
        // Check if this item is a direct child list or nested experience
        const titleEl = item.querySelector('.t-bold span, [class*="t-bold"] span');
        const companyEl = item.querySelector('.t-normal span, [class*="t-normal"] span');
        const durationEl = item.querySelector('.t-14.t-black--light span, [class*="t-14"] span');
        const descEl = item.querySelector('.inline-show-more-text span, [class*="show-more-text"] span');

        if (titleEl && titleEl.textContent) {
          const title = titleEl.textContent.trim();
          let company = companyEl && companyEl.textContent ? companyEl.textContent.trim() : '';
          
          // Clean company text (sometimes includes "Full-time", "Contract", etc.)
          if (company) {
            company = company.split(' · ')[0].split('\n')[0].trim();
          }

          const duration = durationEl && durationEl.textContent ? durationEl.textContent.trim() : '';
          const description = descEl && descEl.textContent ? descEl.textContent.replace('...see more', '').trim() : '';

          // Avoid duplicates or parsing errors
          if (title && !experience.some((e) => e.title === title && e.company === company)) {
            experience.push({ title, company, duration, description });
          }
        }
      });
    }

    // 6. Parse Education
    const education: EducationItem[] = [];
    const eduSection = this.findSectionByHeading('Education');
    if (eduSection) {
      const items = eduSection.querySelectorAll('li.artdeco-list__item, li');
      items.forEach((item) => {
        const schoolEl = item.querySelector('.t-bold span, [class*="t-bold"] span');
        const degreeEl = item.querySelector('.t-normal span, [class*="t-normal"] span');
        
        if (schoolEl && schoolEl.textContent) {
          const school = schoolEl.textContent.trim();
          let degree = '';
          let fieldOfStudy = '';

          if (degreeEl && degreeEl.textContent) {
            const parts = degreeEl.textContent.split(',');
            degree = parts[0] ? parts[0].trim() : '';
            fieldOfStudy = parts[1] ? parts[1].trim() : '';
          }

          if (school && !education.some((e) => e.school === school)) {
            education.push({ school, degree, fieldOfStudy });
          }
        }
      });
    }

    // 7. Parse Skills
    const skills: string[] = [];
    const skillsSection = this.findSectionByHeading('Skills');
    if (skillsSection) {
      const skillElements = skillsSection.querySelectorAll('.t-bold span, [class*="t-bold"] span');
      skillElements.forEach((el) => {
        if (el.textContent) {
          const skill = el.textContent.trim();
          // Exclude headings or subheaders
          if (skill && skill.length > 1 && skill.length < 50 && !skills.includes(skill) && !skill.toLowerCase().includes('endorse')) {
            skills.push(skill);
          }
        }
      });
    }

    // Determine current position/company from experience
    const currentPosition = experience[0]?.title || '';
    const company = experience[0]?.company || '';

    return {
      name: name || 'LinkedIn Member',
      headline: headline || currentPosition || '',
      currentPosition,
      company,
      location,
      about,
      experience,
      education,
      skills: skills.slice(0, 15), // Limit to top 15 skills
    };
  }
}
