import { describe, it, expect, beforeEach } from 'vitest';
import { SafeMarkdownPipe } from './safe-markdown.pipe';

describe('SafeMarkdownPipe', () => {
  let pipe: SafeMarkdownPipe;

  beforeEach(() => {
    pipe = new SafeMarkdownPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return empty string for null, undefined, or empty values', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('should render bold and italic markdown correctly', () => {
    const input = 'هذا **نشاط مميز** وأيضاً *جولة ممتعة*';
    const output = pipe.transform(input);
    expect(output).toContain('<strong class="font-bold text-white">نشاط مميز</strong>');
    expect(output).toContain('<em class="italic text-white/90">جولة ممتعة</em>');
  });

  it('should render markdown headings (###, ##, #)', () => {
    const input = '### الأنشطة المقترحة\n## جولات القاهرة\n# دليل مصر';
    const output = pipe.transform(input);
    expect(output).toContain('<h4 class="text-sm font-bold text-yellow-400 mt-2.5 mb-1">الأنشطة المقترحة</h4>');
    expect(output).toContain('<h3 class="text-base font-bold text-yellow-400 mt-3 mb-1.5">جولات القاهرة</h3>');
    expect(output).toContain('<h2 class="text-lg font-bold text-yellow-400 mt-3.5 mb-2">دليل مصر</h2>');
  });

  it('should render unordered and ordered lists', () => {
    const input = '- الأهرامات\n- المتحف المصري\n1. حجز التذكرة\n2. الوصول مبكراً';
    const output = pipe.transform(input);
    expect(output).toContain('<ul class="list-disc list-inside space-y-1 my-1.5 text-white/90">');
    expect(output).toContain('<li>الأهرامات</li>');
    expect(output).toContain('<li>المتحف المصري</li>');
    expect(output).toContain('</ul>');
    expect(output).toContain('<ol class="list-decimal list-inside space-y-1 my-1.5 text-white/90">');
    expect(output).toContain('<li>حجز التذكرة</li>');
    expect(output).toContain('<li>الوصول مبكراً</li>');
    expect(output).toContain('</ol>');
  });

  it('should render safe http and https links with target="_blank" and rel="noopener noreferrer"', () => {
    const input = 'للمزيد زر [موقع وزارة السياحة](https://egymonuments.gov.eg)';
    const output = pipe.transform(input);
    expect(output).toContain('<a href="https://egymonuments.gov.eg" target="_blank" rel="noopener noreferrer" class="text-yellow-400 underline hover:text-yellow-300 transition-colors">موقع وزارة السياحة</a>');
  });

  it('should strip malicious link protocols (javascript:, data:, vbscript:)', () => {
    const maliciousJs = '[اضغط هنا](javascript:alert("XSS"))';
    const outputJs = pipe.transform(maliciousJs);
    expect(outputJs).not.toContain('<a href=');
    expect(outputJs).not.toContain('javascript:');
    expect(outputJs).toBe('اضغط هنا');

    const maliciousData = '[ملف](data:text/html,<script>alert(1)</script>)';
    const outputData = pipe.transform(maliciousData);
    expect(outputData).not.toContain('<a href=');
    expect(outputData).toBe('ملف');
  });

  it('should escape raw HTML tags to prevent XSS injection', () => {
    const xssInput = '<script>alert("hack")</script><img src="x" onerror="alert(1)">';
    const output = pipe.transform(xssInput);
    expect(output).not.toContain('<script>');
    expect(output).not.toContain('<img');
    expect(output).toContain('&lt;script&gt;');
    expect(output).toContain('&lt;img');
  });

  it('should render inline code and code blocks', () => {
    const input = 'استخدم الكود `print("hello")` أو الكود التالي:\n```python\nx = 1\n```';
    const output = pipe.transform(input);
    expect(output).toContain('<code class="bg-black/30 px-1.5 py-0.5 rounded text-xs text-yellow-300 font-mono">print(&quot;hello&quot;)</code>');
    expect(output).toContain('<pre class="bg-black/40 p-2.5 rounded-lg text-xs font-mono overflow-x-auto my-2 border border-white/10"><code>x = 1</code></pre>');
  });
});
