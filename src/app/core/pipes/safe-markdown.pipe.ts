import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'safeMarkdown',
  standalone: true,
})
export class SafeMarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    // 1. Strict HTML entity escaping to prevent XSS
    let escaped = this.escapeHtml(value);

    // 2. Code blocks (```lang ... ```)
    escaped = escaped.replace(/```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g, (_, code) => {
      return `<pre class="bg-black/40 p-2.5 rounded-lg text-xs font-mono overflow-x-auto my-2 border border-white/10"><code>${code.trim()}</code></pre>`;
    });

    // 3. Inline code (`code`)
    escaped = escaped.replace(/`([^`\n]+)`/g, '<code class="bg-black/30 px-1.5 py-0.5 rounded text-xs text-yellow-300 font-mono">$1</code>');

    // 4. Headings (###, ##, #)
    escaped = escaped.replace(/^### (.*$)/gim, '<h4 class="text-sm font-bold text-yellow-400 mt-2.5 mb-1">$1</h4>');
    escaped = escaped.replace(/^## (.*$)/gim, '<h3 class="text-base font-bold text-yellow-400 mt-3 mb-1.5">$1</h3>');
    escaped = escaped.replace(/^# (.*$)/gim, '<h2 class="text-lg font-bold text-yellow-400 mt-3.5 mb-2">$1</h2>');

    // 5. Bold & Italic
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
    escaped = escaped.replace(/__(.*?)__/g, '<strong class="font-bold text-white">$1</strong>');
    escaped = escaped.replace(/\*(.*?)\*/g, '<em class="italic text-white/90">$1</em>');
    escaped = escaped.replace(/_(.*?)_/g, '<em class="italic text-white/90">$1</em>');

    // 6. Safe links: [text](url) with balanced nested parenthesis support and protocol validation
    escaped = escaped.replace(/\[([^\]]+)\]\(((?:[^()]+|\([^()]*\))*)\)/g, (match, linkText, url) => {
      const trimmedUrl = url.trim();
      const lowerUrl = trimmedUrl.toLowerCase();

      // Block unsafe protocols like javascript:, data:, vbscript:
      if (
        lowerUrl.startsWith('javascript:') ||
        lowerUrl.startsWith('data:') ||
        lowerUrl.startsWith('vbscript:') ||
        lowerUrl.startsWith('file:')
      ) {
        return linkText; // Strip malicious link, render text only
      }

      if (
        lowerUrl.startsWith('https://') ||
        lowerUrl.startsWith('http://') ||
        trimmedUrl.startsWith('/') ||
        trimmedUrl.startsWith('#')
      ) {
        return `<a href="${trimmedUrl}" target="_blank" rel="noopener noreferrer" class="text-yellow-400 underline hover:text-yellow-300 transition-colors">${linkText}</a>`;
      }

      return linkText;
    });

    // 7. Lists (unordered - / * and ordered 1.)
    const lines = escaped.split('\n');
    const processedLines: string[] = [];
    let inUl = false;
    let inOl = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
      const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);

      if (ulMatch) {
        if (!inUl) {
          if (inOl) {
            processedLines.push('</ol>');
            inOl = false;
          }
          processedLines.push('<ul class="list-disc list-inside space-y-1 my-1.5 text-white/90">');
          inUl = true;
        }
        processedLines.push(`<li>${ulMatch[1]}</li>`);
      } else if (olMatch) {
        if (!inOl) {
          if (inUl) {
            processedLines.push('</ul>');
            inUl = false;
          }
          processedLines.push('<ol class="list-decimal list-inside space-y-1 my-1.5 text-white/90">');
          inOl = true;
        }
        processedLines.push(`<li>${olMatch[2]}</li>`);
      } else {
        if (inUl) {
          processedLines.push('</ul>');
          inUl = false;
        }
        if (inOl) {
          processedLines.push('</ol>');
          inOl = false;
        }
        processedLines.push(line);
      }
    }
    if (inUl) processedLines.push('</ul>');
    if (inOl) processedLines.push('</ol>');

    escaped = processedLines.join('\n');

    // 8. Line breaks: preserve paragraphs and breaks
    escaped = escaped.replace(/\n\n+/g, '<br/><br/>');
    escaped = escaped.replace(/(?<!<\/li>|<\/ul>|<\/ol>|<\/h2>|<\/h3>|<\/h4>|<\/pre>)\n(?!<ul|<ol|<h2|<h3|<h4|<pre|<li)/g, '<br/>');

    return escaped;
  }

  private escapeHtml(text: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
  }
}
