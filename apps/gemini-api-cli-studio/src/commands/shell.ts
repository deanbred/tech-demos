/** Shell quoting for the command preview. Execution uses the argv array, not this string. */
export function quoteArg(arg: string): string {
  if (/^[A-Za-z0-9_./:@%=+-]+$/.test(arg)) return arg
  if (!/["\\$`\n]/.test(arg)) return `"${arg}"`
  return `'${arg.replaceAll("'", `'\\''`)}'`
}

export function formatShell(argv: readonly string[]): string {
  return argv.map(quoteArg).join(' ')
}
