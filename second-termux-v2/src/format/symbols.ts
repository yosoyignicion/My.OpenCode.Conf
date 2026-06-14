// Unicode/ASCII symbols — single source, with auto-detect for non-unicode terminals.

function isUnicodeSupported(): boolean {
  if (process.platform !== "win32") return process.env.TERM !== "linux";
  return Boolean(
    process.env.WT_SESSION ||
      process.env.TERMINUS_SUBLIME ||
      process.env.ConEmuTask === "{cmd::Cmder}" ||
      process.env.TERM_PROGRAM === "Terminus-Sublime" ||
      process.env.TERM_PROGRAM === "vscode" ||
      process.env.TERM === "xterm-256color" ||
      process.env.TERM === "alacritty" ||
      process.env.TERM === "rxvt-unicode" ||
      process.env.TERM === "kitty" ||
      process.env.TERM?.endsWith("-256color") === true ||
      process.env.COLORTERM === "truecolor",
  );
}

const unicode = isUnicodeSupported();

export const sym = unicode
  ? {
      run: "▶",
      ok: "✨",
      err: "🔥",
      warn: "⚠",
      info: "◇",
      spin: "⏳",
      stop: "⏹",
      kill: "✖",
      clean: "🧹",
      heal: "✦",
      pipe: "│",
      tree: "└─",
      bolt: "⚡",
      dot: "·",
    }
  : {
      run: "[>]",
      ok: "[OK]",
      err: "[ERR]",
      warn: "[!]",
      info: "[i]",
      spin: "[~]",
      stop: "[||]",
      kill: "[X]",
      clean: "[C]",
      heal: "[H]",
      pipe: "|",
      tree: "`-",
      bolt: "->",
      dot: ".",
    };
