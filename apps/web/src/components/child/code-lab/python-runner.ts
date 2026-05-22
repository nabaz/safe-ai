// Real Python runtime via Pyodide (CPython compiled to WebAssembly).
// Loaded once from CDN, then reused across runs. Each run gets a fresh
// global scope so previous lesson code doesn't leak in.

export interface RunResult {
  output: string[]
  error: string | null
}

interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<unknown>
  setStdout: (opts: { batched: (msg: string) => void }) => void
  setStderr: (opts: { batched: (msg: string) => void }) => void
  globals: {
    clear: () => void
    get: (key: string) => unknown
  }
}

type PyodideLoader = (opts: { indexURL: string }) => Promise<PyodideInstance>

declare global {
  interface Window {
    loadPyodide?: PyodideLoader
  }
}

const PYODIDE_VERSION = '0.27.7'
const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

let pyodidePromise: Promise<PyodideInstance> | null = null

function loadPyodide(): Promise<PyodideInstance> {
  if (pyodidePromise) return pyodidePromise

  pyodidePromise = (async () => {
    if (typeof window === 'undefined') {
      throw new Error('Pyodide can only run in the browser')
    }

    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
          `script[data-pyodide="${PYODIDE_VERSION}"]`,
        )
        if (existing) {
          existing.addEventListener('load', () => resolve(), { once: true })
          existing.addEventListener('error', () => reject(new Error('Pyodide script failed to load')), { once: true })
          return
        }
        const script = document.createElement('script')
        script.src = `${PYODIDE_INDEX}pyodide.js`
        script.async = true
        script.dataset.pyodide = PYODIDE_VERSION
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Pyodide script failed to load'))
        document.head.appendChild(script)
      })
    }

    if (!window.loadPyodide) {
      throw new Error('Pyodide loader missing after script load')
    }
    return window.loadPyodide({ indexURL: PYODIDE_INDEX })
  })().catch((err) => {
    // Allow retry on transient failures (network blip, CDN hiccup).
    pyodidePromise = null
    throw err
  })

  return pyodidePromise
}

/** Kick off Pyodide loading without waiting — call on page mount for warm start. */
export function preloadPyodide(): void {
  loadPyodide().catch(() => { /* surfaced by next runPython */ })
}

export async function runPython(code: string): Promise<RunResult> {
  const output: string[] = []

  try {
    const py = await loadPyodide()

    // Fresh scope per run so previous lesson definitions don't leak.
    py.globals.clear()

    const push = (chunk: string) => {
      // Pyodide batches multiple lines into one chunk; split so each `print`
      // line renders on its own row in the output panel.
      for (const line of chunk.split('\n')) output.push(line)
      // Drop trailing empty line from the final '\n' of a print statement.
      if (output.length > 0 && output[output.length - 1] === '') output.pop()
    }
    py.setStdout({ batched: push })
    py.setStderr({ batched: push })

    await py.runPythonAsync(code)
    return { output, error: null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { output, error: friendlyPythonError(msg) }
  }
}

/**
 * Pyodide surfaces the full Python traceback as the error message. Kids only
 * care about the last line (the actual error). Strip the rest.
 */
function friendlyPythonError(msg: string): string {
  const lines = msg.split('\n').map(l => l.trimEnd()).filter(Boolean)
  if (lines.length === 0) return 'Something went wrong'
  // The last non-empty line is typically `ErrorType: explanation`.
  const last = lines[lines.length - 1]!
  // Trim noisy file path prefixes Pyodide injects.
  return last.replace(/^.*?: /, (match) => match)
}
