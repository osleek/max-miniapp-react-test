import { LIBRARY } from './components/library'
import { registerComponents } from './registry'

export * from './component'
export * from './registry'
export * from './solver'
export { LIBRARY, wavelengthColor } from './components/library'

let registered = false

export function registerLibrary(): void {
  if (registered) return
  registered = true
  registerComponents(LIBRARY)
}

registerLibrary()
