import React from 'react';

// Split text on **bold** and *italic* markers, return array of strings/elements
function inlineMarkdown(text) {
  return text.split(/(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*)/).map((p, i) => {
    if (p.startsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('*'))  return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  });
}

export function renderMarkdown(text) {
  if (!text?.trim()) return null;
  const lines = text.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^# /.test(line)) {
      out.push(<div key={i} style={{ fontWeight: 700, color: 'var(--tx1)', fontSize: '0.9rem', marginTop: i > 0 ? '0.5rem' : 0, marginBottom: '0.2rem' }}>{inlineMarkdown(line.slice(2))}</div>);
    } else if (/^## /.test(line)) {
      out.push(<div key={i} style={{ fontWeight: 700, color: 'var(--tx2)', fontSize: '0.82rem', marginTop: i > 0 ? '0.35rem' : 0, marginBottom: '0.15rem' }}>{inlineMarkdown(line.slice(3))}</div>);
    } else if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(<li key={i} style={{ marginBottom: '0.1rem' }}>{inlineMarkdown(lines[i].slice(2))}</li>);
        i++;
      }
      out.push(<ul key={`ul${i}`} style={{ margin: '0.25rem 0', paddingLeft: '1.25rem' }}>{items}</ul>);
      continue;
    } else if (line.trim() === '') {
      if (out.length > 0) out.push(<div key={i} style={{ height: '0.4rem' }} />);
    } else {
      out.push(<div key={i} style={{ lineHeight: 1.65 }}>{inlineMarkdown(line)}</div>);
    }
    i++;
  }
  return <>{out}</>;
}
