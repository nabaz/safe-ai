// Safe Python-subset runner
// Transpiles the limited Python used in our lessons into JS and runs it
// in an isolated scope.

export interface RunResult {
  output: string[]
  error: string | null
}

export function runPython(code: string): RunResult {
  const output: string[] = []

  try {
    const js = transpileToJS(code)

    const sandbox = new Function(
      'print', 'len', 'str', 'int', 'float', 'round', 'range', 'abs', 'max', 'min', 'sum',
      js
    )

    sandbox(
      (...args: unknown[]) => output.push(args.map(pythonRepr).join(' ')),
      (x: unknown) => {
        if (typeof x === 'string') return x.length
        if (Array.isArray(x)) return x.length
        if (x && typeof x === 'object') return Object.keys(x).length
        return 0
      },
      (x: unknown) => String(x),
      (x: unknown) => Math.trunc(Number(x)),
      (x: unknown) => Number(x),
      (x: number, digits = 0) => {
        const factor = Math.pow(10, digits)
        return Math.round(x * factor) / factor
      },
      (startOrStop: number, stop?: number, step = 1) => {
        const start = stop === undefined ? 0 : startOrStop
        const end   = stop === undefined ? startOrStop : stop
        const result: number[] = []
        if (step > 0) { for (let i = start; i < end; i += step) result.push(i) }
        else          { for (let i = start; i > end; i += step) result.push(i) }
        return result
      },
      Math.abs,
      Math.max,
      Math.min,
      (arr: number[]) => arr.reduce((a, b) => a + b, 0),
    )

    return { output, error: null }
  } catch (e) {
    return {
      output,
      error: e instanceof Error ? friendlyError(e.message) : 'Something went wrong',
    }
  }
}

// ── Transpiler ────────────────────────────────────────────────────────────────

function transpileToJS(python: string): string {
  // Normalise line endings, strip trailing whitespace per line
  const rawLines = python.replace(/\r\n/g, '\n').split('\n').map(l => l.trimEnd())

  // Filter out blank-only content but keep blank lines for structure
  const lines = rawLines

  const output: string[] = []
  // Stack of indent levels that opened a block
  const indentStack: number[] = []

  for (let i = 0; i < lines.length; i++) {
    const raw   = lines[i]
    const trimmed = raw.trimStart()
    const indent  = raw.length - trimmed.length

    // Skip blank lines and comments
    if (trimmed === '') { output.push(''); continue }
    if (trimmed.startsWith('#')) { output.push(' '.repeat(indent) + '//' + trimmed.slice(1)); continue }

    // Close any open blocks whose indent level is >= current indent
    while (indentStack.length > 0 && indentStack[indentStack.length - 1]! >= indent) {
      indentStack.pop()
      const closeIndent = indentStack.length * 2
      output.push(' '.repeat(closeIndent) + '}')
    }

    const jsIndent = ' '.repeat(indentStack.length * 2)

    // ── Block-opening statements ──────────────────────────────────────────

    // for i in range(...)
    const forRange = trimmed.match(/^for\s+(\w+)\s+in\s+range\((.+)\)\s*:$/)
    if (forRange) {
      output.push(jsIndent + `for (const ${forRange[1]} of range(${transpileExpr(forRange[2])})) {`)
      indentStack.push(indent)
      continue
    }

    // for x in <iterable>
    const forIn = trimmed.match(/^for\s+(\w+)\s+in\s+(.+)\s*:$/)
    if (forIn) {
      output.push(jsIndent + `for (const ${forIn[1]} of ${transpileExpr(forIn[2])}) {`)
      indentStack.push(indent)
      continue
    }

    // def name(args):
    const defM = trimmed.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*:$/)
    if (defM) {
      output.push(jsIndent + `function ${defM[1]}(${defM[2]}) {`)
      indentStack.push(indent)
      continue
    }

    // if condition:
    const ifM = trimmed.match(/^if\s+(.+)\s*:$/)
    if (ifM) {
      output.push(jsIndent + `if (${transpileCond(ifM[1])}) {`)
      indentStack.push(indent)
      continue
    }

    // elif condition:
    const elifM = trimmed.match(/^elif\s+(.+)\s*:$/)
    if (elifM) {
      output.push(jsIndent + `} else if (${transpileCond(elifM[1])}) {`)
      // don't push to stack — elif closes + reopens at same level
      indentStack.push(indent)
      continue
    }

    // else:
    if (trimmed === 'else:') {
      output.push(jsIndent + '} else {')
      indentStack.push(indent)
      continue
    }

    // ── Regular statements ────────────────────────────────────────────────

    output.push(jsIndent + transpileStmt(trimmed) + ';')
  }

  // Close any remaining open blocks
  while (indentStack.length > 0) {
    indentStack.pop()
    const closeIndent = indentStack.length * 2
    output.push(' '.repeat(closeIndent) + '}')
  }

  return output.join('\n')
}

// ── Statement transpilation ───────────────────────────────────────────────────

function transpileStmt(line: string): string {
  // return expr
  const retM = line.match(/^return\s+(.*)$/)
  if (retM) return `return ${transpileExpr(retM[1])}`

  // print(...)
  const printM = line.match(/^print\((.*)?\)$/)
  if (printM) return `print(${transpileArgs(printM[1] ?? '')})`

  // x.method(args)
  const methodM = line.match(/^(\w+)\.(append|remove|sort|reverse)\((.*)\)$/)
  if (methodM) {
    const [, obj, method, args] = methodM
    if (method === 'append')  return `${obj}.push(${transpileExpr(args ?? '')})`
    if (method === 'remove')  return `${obj}.splice(${obj}.indexOf(${transpileExpr(args ?? '')}), 1)`
    if (method === 'sort')    return `${obj}.sort()`
    if (method === 'reverse') return `${obj}.reverse()`
  }

  // variable = expr  (only if looks like an assignment)
  const assignM = line.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/)
  if (assignM) {
    return `let ${assignM[1]} = ${transpileExpr(assignM[2])}`
  }

  // Bare expression (function call etc.)
  return transpileExpr(line)
}

// ── Expression transpilation ──────────────────────────────────────────────────

function transpileExpr(expr: string): string {
  if (!expr) return ''
  let e = expr.trim()

  // Python keywords -> JS equivalents
  e = e.replace(/\bNone\b/g,  'null')
  e = e.replace(/\bTrue\b/g,  'true')
  e = e.replace(/\bFalse\b/g, 'false')
  e = e.replace(/\band\b/g,   '&&')
  e = e.replace(/\bor\b/g,    '||')
  e = e.replace(/\bnot\b/g,   '!')

  // ** -> Math.pow
  e = e.replace(/([a-zA-Z_\w.]+|\d+(?:\.\d+)?)\s*\*\*\s*([a-zA-Z_\w.]+|\d+(?:\.\d+)?)/g,
    'Math.pow($1, $2)')

  // f-strings
  e = e.replace(/f"([^"]*)"/g, (_, inner) =>
    '`' + inner.replace(/\{([^}]+)\}/g, '${$1}') + '`')
  e = e.replace(/f'([^']*)'/g, (_, inner) =>
    '`' + inner.replace(/\{([^}]+)\}/g, '${$1}') + '`')

  return e
}

function transpileCond(cond: string): string {
  let c = transpileExpr(cond)
  // Python == -> JS === (careful not to touch already-converted === or !=)
  c = c.replace(/([^!<>=])=(?![=>])/g, '$1===')
  // Fix any accidental quadruple ====
  c = c.replace(/====/g, '===')
  return c
}

function transpileArgs(args: string): string {
  return splitTopLevel(args).map(transpileExpr).join(', ')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Split a comma-separated argument string respecting brackets and strings */
function splitTopLevel(s: string): string[] {
  const parts: string[] = []
  let depth = 0, current = '', inStr = false, strChar = ''

  for (const ch of s) {
    if (!inStr && (ch === '"' || ch === "'")) { inStr = true; strChar = ch; current += ch; continue }
    if (inStr && ch === strChar)              { inStr = false; current += ch; continue }
    if (inStr)                                { current += ch; continue }
    if ('([{'.includes(ch))  { depth++; current += ch; continue }
    if (')]}'.includes(ch))  { depth--; current += ch; continue }
    if (ch === ',' && depth === 0) { parts.push(current.trim()); current = ''; continue }
    current += ch
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

/** Convert JS value to Python-style repr */
function pythonRepr(val: unknown): string {
  if (val === null || val === undefined) return 'None'
  if (val === true)  return 'True'
  if (val === false) return 'False'
  if (Array.isArray(val))
    return '[' + val.map(pythonRepr).join(', ') + ']'
  if (typeof val === 'object') {
    const pairs = Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => `'${k}': ${pythonRepr(v)}`).join(', ')
    return '{' + pairs + '}'
  }
  return String(val)
}

/** Turn cryptic JS errors into kid-friendly messages */
function friendlyError(msg: string): string {
  if (msg.includes('is not defined')) {
    const name = msg.match(/(\w+) is not defined/)?.[1]
    return `"${name}" hasn't been created yet — check your spelling!`
  }
  if (msg.includes('SyntaxError')) return 'Check your code for typos — something looks off!'
  if (msg.includes('is not a function')) return 'That doesn\'t look like a valid function call!'
  if (msg.includes('Cannot read')) return 'Something is missing or empty — check your variables!'
  return 'Oops! Something went wrong. Check your code and try again.'
}
