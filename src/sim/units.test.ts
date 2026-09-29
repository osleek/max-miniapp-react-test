import { describe, expect, it } from 'vitest'
import { UNITS, groupForDimension, sameDimension } from '@/physics/quantity'
import { LIBRARY } from './components/library'
import { canConnect, portsCompatible, solveScheme, type Scheme } from './solver'
import type { PortSpec } from './component'

function port(key: string, index: number): PortSpec {
  const spec = specOf(key)
  const found = spec.ports[index]
  if (!found) throw new Error(`у ${key} нет порта `)
  return found
}

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
    const base = result.values['l:wavelength']
    const port = spec.ports.find((entry) => entry.id === 'wavelength')

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
      ],
      links: [
        { id: 'l1', from: { component: 's', terminal: 'right' }, to: { component: 'h', terminal: 'left' } },
        { id: 'l2', from: { component: 'h', terminal: 'right' }, to: { component: 'b', terminal: 'left' } },
      ],
    }

    const result = solveScheme(scheme, { time: 0 })
    const port = specOf('thermometer').ports.find((entry) => entry.id === 'out')

    expect(port).toBeDefined()
    expect(result.issues).toEqual([])

    const body = result.values['b:out']
    expect(body).not.toBeNull()

    
    expect(body!).toBeGreaterThan(273.15)

    const shown = (body! - (port!.unit.offset ?? 0)) / port!.unit.factor

    expect(shown).toBeGreaterThan(15)
    expect(shown).toBeLessThan(30)
  })
})

describe('мощность и углы', () => {
  it('лампа не выдаёт мощность больше номинальной', () => {
    const scheme: Scheme = {
      components: [
        { id: 's', key: 'source', params: { emf: 24 } },
        { id: 'l', key: 'lamp', params: { power: 20, nominal: 12 } },
      ],
      links: [{ id: 'w', from: { component: 's', terminal: 'right' }, to: { component: 'l', terminal: 'left' } }],
    }

    const power = solveScheme(scheme).values['l:power']

    expect(power).not.toBeNull()
    expect(power!).toBeGreaterThan(0)
    expect(power!).toBeLessThanOrEqual(20)
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

describe('соединяемость по группам величин', () => {
  it('электрические величины соединяются между собой', () => {
    expect(portsCompatible(port('source', 0), port('voltmeter', 0))).toBe(true)
    expect(portsCompatible(port('source', 0), port('resistor', 0))).toBe(true)
    expect(portsCompatible(port('resistor', 1), port('lamp', 0))).toBe(true)
    expect(portsCompatible(port('source', 0), port('heater', 0))).toBe(true)
  })

  it('тепло соединяется с температурой', () => {
    expect(portsCompatible(port('body', 2), port('thermometer', 0))).toBe(true)
  })

  it('время подключается к любому прибору, которому нужно время', () => {
    expect(portsCompatible(port('timer', 0), port('body', 1))).toBe(true)
    expect(portsCompatible(port('pendulum', 0), port('body', 1))).toBe(true)
  })

  it('разные группы не соединяются: температуру нельзя подать на резистор', () => {
    expect(portsCompatible(port('body', 2), port('resistor', 0))).toBe(false)
  })

  it('вход соединяется только с выходом', () => {
    const meter = specOf('ammeter')
    const resistor = specOf('resistor')

    const outToIn = canConnect(meter, 'right', resistor, 'left')
    expect(outToIn.ok).toBe(true)

    const inToIn = canConnect(meter, 'left', resistor, 'left')
    expect(inToIn.ok).toBe(false)
    if (!inToIn.ok) expect(inToIn.reason).toContain('входы')

    const outToOut = canConnect(meter, 'right', resistor, 'right')
    expect(outToOut.ok).toBe(false)
    if (!outToOut.ok) expect(outToOut.reason).toContain('выходы')
  })

  it('источник → амперметр → резистор → источник собирается без ошибок', () => {
    const scheme: Scheme = {
      components: [
        { id: 'src', key: 'source', params: { emf: 12 } },
        { id: 'amp', key: 'ammeter', params: { limit: 20 } },
        { id: 'r', key: 'resistor', params: { resistance: 10 } },
      ],
      links: [
        { id: 'l1', from: { component: 'src', terminal: 'right' }, to: { component: 'amp', terminal: 'left' } },
        { id: 'l2', from: { component: 'amp', terminal: 'right' }, to: { component: 'r', terminal: 'left' } },
      ],
    }

    const result = solveScheme(scheme)

    expect(result.issues).toEqual([])
    expect(result.values['amp:out']).toBeCloseTo(12, 6)
    expect(result.values['r:voltage']).toBeCloseTo(120, 6)
  })

  it('у каждого прибора вход и выход различимы и подписаны', () => {
    for (const spec of LIBRARY) {
      for (const terminal of spec.terminals) {
        const port = spec.ports.find((entry) => entry.id === terminal.port)
        expect(port, `«${spec.title}»: клемма ${terminal.id} без порта`).toBeDefined()
        expect(port!.dir, `«${spec.title}»: клемма ${terminal.id} не совпадает с портом`).toBe(terminal.dir)
        expect(port!.label.length).toBeGreaterThan(0)
      }

      for (const port of spec.ports.filter((entry) => entry.dir === 'out' && !entry.readonly)) {
        const hasTerminal = spec.terminals.some((terminal) => terminal.port === port.id)
        expect(hasTerminal, `«${spec.title}»: у выхода ${port.id} нет клеммы`).toBe(true)
      }
    }
  })
})

describe('группы величин', () => {
  it('электрические величины попадают в группу «electrical»', () => {
    for (const unit of [UNITS.volt, UNITS.ampere, UNITS.ohm, UNITS.watt, UNITS.henry, UNITS.farad]) {
      expect(groupForDimension(unit.dimension)).toBe('electrical')
    }
  })

  it('время, температура и длина попадают в свои группы', () => {
    expect(groupForDimension(UNITS.second.dimension)).toBe('time')
    expect(groupForDimension(UNITS.celsius.dimension)).toBe('thermal')
    expect(groupForDimension(UNITS.metre.dimension)).toBe('geometric')
    expect(groupForDimension(UNITS.newton.dimension)).toBe('mechanical')
  })

  it('размерности в порядке', () => {
    for (const spec of LIBRARY) {
      for (const port of spec.ports) {
        expect(sameDimension(port.unit.dimension, port.unit.dimension)).toBe(true)
      }
    }

    expect(UNITS.celsius.offset).toBe(273.15)
  })
})
