// ESM loader that resolves @/ to src/ with .js extension auto-append
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(__dirname, '..', 'src')

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    let resolved = path.join(srcDir, specifier.slice(2))
    // Auto-append .js if no extension and file doesn't exist but .js does
    if (!path.extname(resolved) && !fs.existsSync(resolved) && fs.existsSync(resolved + '.js')) {
      resolved += '.js'
    }
    return nextResolve(pathToFileURL(resolved).href, context)
  }
  return nextResolve(specifier, context)
}
