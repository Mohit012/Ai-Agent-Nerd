'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Highlight, themes } from 'prism-react-renderer';
import { useTheme } from '@/context/ThemeContext';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

function CodeBlock({ children, className, ...props }) {
  const [copied, setCopied] = useState(false);
  const { darkMode } = useTheme();
  const match = /language-(\w+)/.exec(className || '');
  const code = String(children).replace(/\n$/, '');

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!match) {
    return (
      <code className={`px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-sm font-mono text-slate-800 dark:text-slate-200 ${className}`} {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative group rounded-xl overflow-hidden my-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{match[1]}</span>
        <button
          onClick={copyCode}
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : (
            <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          )}
        </button>
      </div>
      <Highlight
        theme={darkMode ? themes.nightOwl : themes.github}
        code={code}
        language={match[1]}
      >
        {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`${hlClassName} p-4 overflow-x-auto text-sm`} style={{ ...style, background: 'transparent' }}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span className="select-none text-slate-400 dark:text-slate-600 w-8 inline-block text-right mr-4">{i + 1}</span>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

export default function MarkdownRenderer({ content }) {
  const { darkMode } = useTheme();

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          if (inline) {
            return (
              <code className={`px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-sm font-mono text-emerald-600 dark:text-emerald-400 ${className}`} {...props}>
                {children}
              </code>
            );
          }
          return <CodeBlock className={className} {...props}>{children}</CodeBlock>;
        },
        a({ node, children, href, ...props }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 underline underline-offset-2"
              {...props}
            >
              {children}
            </a>
          );
        },
        table({ node, children, ...props }) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden" {...props}>
                {children}
              </table>
            </div>
          );
        },
        th({ node, children, ...props }) {
          return (
            <th className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-left text-sm font-semibold text-slate-700 dark:text-slate-200" {...props}>
              {children}
            </th>
          );
        },
        td({ node, children, ...props }) {
          return (
            <td className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300" {...props}>
              {children}
            </td>
          );
        },
        blockquote({ node, children, ...props }) {
          return (
            <blockquote className="border-l-4 border-emerald-500 pl-4 my-4 italic text-slate-600 dark:text-slate-300" {...props}>
              {children}
            </blockquote>
          );
        },
        ul({ node, children, ...props }) {
          return <ul className="list-disc list-inside my-2 space-y-1" {...props}>{children}</ul>;
        },
        ol({ node, children, ...props }) {
          return <ol className="list-decimal list-inside my-2 space-y-1" {...props}>{children}</ol>;
        },
        li({ node, children, ...props }) {
          return <li className="text-slate-700 dark:text-slate-300" {...props}>{children}</li>;
        },
        h1({ node, children, ...props }) {
          return <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-6 mb-3" {...props}>{children}</h1>;
        },
        h2({ node, children, ...props }) {
          return <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-5 mb-2" {...props}>{children}</h2>;
        },
        h3({ node, children, ...props }) {
          return <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mt-4 mb-2" {...props}>{children}</h3>;
        },
        p({ node, children, ...props }) {
          return <p className="my-2 leading-relaxed" {...props}>{children}</p>;
        },
        strong({ node, children, ...props }) {
          return <strong className="font-semibold text-slate-800 dark:text-slate-200" {...props}>{children}</strong>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
