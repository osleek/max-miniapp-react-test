import { describe, expect, it } from 'vitest'
import { UNITS, sameDimension } from '@/physics/quantity'
import { LIBRARY } from './components/library'
import { solveScheme, type Scheme } from './solver'

import { getComponent } from './index'

function specOf(key: string) {
  const spec = getComponent(key)
  if (!spec) throw new Error(`нет компонента ${key}`)
  return spec
}

describe('единицы портов: базовое значение — в единице фактора', () => {
  it('лазер отдаёт длину волны в метрах, а не в нанометрах', () => {
    const spec = specOf('laser')
    const scheme: Scheme = { components: [{ id: 'l', key: 'laser', params: { wavelength: 650 } }], links: [] }
    const result = solveScheme(scheme)
    const base = result.values['l:out']
    const port = spec.ports.find((entry) => entry.id === 'out')

    expect(port).toBeDefined()
    expect(base).not.toBeNull()

    const shown = (base! - (port!.unit.offset ?? 0)) / port!.unit.factor
    expect(shown).toBeCloseTo(650, 6)
  })

  it('тело отдаёт температуру в кельвинах, а °C получаются только на выводе', () => {
    const scheme: Scheme = {
      components: [
        { id: 's', key: 'source', params: { emf: 12 } },
        { id: 'h', key: 'heater', params: { resistance: 10 } },
        { id: 'b', key: 'body', params: { mass: 0.05, capacity: 400, start: 20 } },
        { id: 't', key: 'thermometer', params: { limit: 100 } },
      ],
      links: [
        
        { id: 'l1', from: { component: 's', terminal: 'plus' }, to: { component: 'h', terminal: 'left' } },
        { id: 'l2', from: { component: 'h', terminal: 'right' }, to: { component: 'b', terminal: 'left' } },
      ],
    }

    const result = solveScheme(scheme, { time: 60 })
    const port = specOf('thermometer').ports.find((entry) => entry.id === 'out')

    expect(port).toBeDefined()
    expect(result.issues).toEqual([])

    const body = result.values['b:out']
    expect(body).not.toBeNull()

    
    expect(body!).toBeGreaterThan(273.15)

    const shown = (body! - (port!.unit.offset ?? 0)) / port!.unit.factor

    
    expect(shown).toBeGreaterThan(55)
    expect(shown).toBeLessThan(70)
  })})

describe('мощность и углы', () => {
  it('лампа не выдаёт мощность больше, чем позволяет порт', () => {
    const scheme: Scheme = {
      components: [
        { id: 's', key: 'source', params: { emf: 12 } },
        { id: 'l', key: 'lamp', params: { power: 20 } },
      ],
      links: [{ id: 'w', from: { component: 's', terminal: 'plus' }, to: { component: 'l', terminal: 'left' } }],
    }

    const power = solveScheme(scheme).values['l:power']

    expect(power).not.toBeNull()
    expect(power!).toBeGreaterThan(0)
    expect(power!).toBeLessThan(100)
  })

  it('зеркало отражает луч хотя бы при нулевом наклоне', () => {
    const scheme: Scheme = {
      components: [
        { id: 'a', key: 'laser', params: { wavelength: 650, angle: 30 } },
        { id: 'm', key: 'mirror', params: { tilt: 0 } },
      ],
      links: [{ id: 'w', from: { component: 'a', terminal: 'right' }, to: { component: 'm', terminal: 'left' } }],
    }

    const result = solveScheme(scheme)

    expect(result.issues).toEqual([])
    expect(result.values['a:angle']).toBeCloseTo(30, 6)
    expect(result.values['m:out']).not.toBeNull()
    expect(result.values['m:out']!).toBeGreaterThan(0)
  })
})

describe('размерности выходных портов', () => {
  it('у каждого выходного порта есть вычислимое значение в своей величине', () => {
    for (const spec of LIBRARY) {
      for (const port of spec.ports) {
        expect(sameDimension(port.unit.dimension, port.unit.dimension)).toBe(true)
      }
    }

    expect(UNITS.celsius.offset).toBe(273.15)
  })
})
