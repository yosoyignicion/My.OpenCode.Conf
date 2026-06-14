function isUnicodeSupported(): boolean {
  if (process.platform !== 'win32') {
    return process.env.TERM !== 'linux'
  }
  return Boolean(process.env.WT_SESSION)
    || Boolean(process.env.TERMINUS_SUBLIME)
    || process.env.ConEmuTask === '{cmd::Cmder}'
    || process.env.TERM_PROGRAM === 'Terminus-Sublime'
    || process.env.TERM_PROGRAM === 'vscode'
    || process.env.TERM === 'xterm-256color'
    || process.env.TERM === 'alacritty'
    || process.env.TERM === 'rxvt-unicode'
    || process.env.TERM === 'kitty'
    || process.env.TERM?.endsWith('-256color')
    || process.env.COLORTERM === 'truecolor'
}

const unicode = isUnicodeSupported()

export const symbols = unicode ? {
  saved: '✅',
  search: '🔍',
  deleted: '🗑️',
  warning: '⚠️',
  context: '📝',
  stats: '📊',
  error: '❌',
  success: '🎉',
  package: '📦',
  graph: '🕸️',
  diff: '🔀',
  export: '📤',
  compact: '🧹',
} : {
  saved: '[OK]',
  search: '[?]',
  deleted: '[DEL]',
  warning: '[!]',
  context: '[CTX]',
  stats: '[STATS]',
  error: '[ERR]',
  success: '[PASS]',
  package: '[TEST]',
  graph: '[GRAPH]',
  diff: '[DIFF]',
  export: '[EXPORT]',
  compact: '[COMPACT]',
}
