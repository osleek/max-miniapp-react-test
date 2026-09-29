import type { ReactNode } from 'react'
import { UNITS } from '@/physics/quantity'
import type { ComponentSpec, ViewProps } from '../component'

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 3,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const INK = 'var(--lab-ink, #111)'
const ACCENT = 'var(--lab-accent, #d5372c)'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function dial(props: {
  value: number | null
  limit: number
  letter: string
}): ReactNode {
  const share = props.value === null ? 0 : clamp(Math.abs(props.value) / props.limit, 0, 1)
  const angle = -60 + share * 120

  return (
    <g>
      <circle cx={50} cy={50} r={30} {...STROKE} />
      <path d="M26 64a26 26 0 0 1 48 0" {...STROKE} opacity={0.4} />
      <line
        x1={50}
        y1={54}
        x2={50 + 22 * Math.sin((angle * Math.PI) / 180)}
        y2={54 - 22 * Math.cos((angle * Math.PI) / 180)}
        stroke={ACCENT}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx={50} cy={54} r={3} fill={INK} />
      <text x={50} y={86} textAnchor="middle" fontSize={20} fill={INK}>
        {props.letter}
      </text>
    </g>
  )
}

export const electricityComponents: ComponentSpec[] = [
  {
    key: 'source',
    domain: 'electricity',
    title: 'Источник питания',
    hint: 'Задаёт напряжение на участке цепи',
    ports: [{ id: 'out', label: 'Напряжение', unit: UNITS.volt, dir: 'out', group: 'electrical' }],
    terminals: [{ id: 'right', x: 86, y: 50, side: 'right', port: 'out', dir: 'out' }],
    params: [
      { id: 'emf', label: 'ЭДС', unit: UNITS.volt, of: 'control', min: 0, max: 24, step: 0.5, value: 12 },
    ],
    compute: ({ params }) => ({ out: params.emf ?? 0 }),
    view: ({ params }) => (
      <g>
        <path d="M40 22v56" {...STROKE} />
        <path d="M60 36v28" {...STROKE} />
        <path d="M40 50H14M60 50h26" {...STROKE} />
        <text x={50} y={16} textAnchor="middle" fontSize={13} fill={INK}>
          {params.emf ?? 0} В
        </text>
      </g>
    ),
  },
  {
    key: 'ammeter',
    domain: 'electricity',
    title: 'Амперметр',
    hint: 'Включается в цепь последовательно: ток входит в левую клемму и выходит из правой',
    ports: [
      { id: 'in', label: 'Сила тока', unit: UNITS.ampere, dir: 'in', group: 'electrical', modifier: true, passthrough: true },
      { id: 'out', label: 'Сила тока', unit: UNITS.ampere, dir: 'out', group: 'electrical' },
    ],
    terminals: [
      { id: 'left', x: 10, y: 50, side: 'left', port: 'in', dir: 'in' },
      { id: 'right', x: 90, y: 50, side: 'right', port: 'out', dir: 'out' },
    ],
    params: [
      { id: 'limit', label: 'Предел измерения', unit: UNITS.ampere, of: 'setting', min: 0.1, max: 20, step: 0.1, value: 2 },
    ],
    compute: ({ inputs, params }) => {
      const value = inputs.in ?? null
      if (value === null) return { out: null }

      const limit = params.limit ?? 1
      const shown = Math.abs(value) > limit ? Math.sign(value) * limit : value
      return { out: shown }
    },
    view: ({ outputs, inputs, params }) => (
      <g>
        {dial({ value: outputs.out ?? inputs.in ?? null, limit: params.limit ?? 1, letter: 'A' })}
        <text x={50} y={12} textAnchor="middle" fontSize={12} fill={INK}>
          {outputs.out === null || outputs.out === undefined ? '—' : `${outputs.out.toFixed(2)} А`}
        </text>
      </g>
    ),
  },
  {
    key: 'resistor',
    domain: 'electricity',
    title: 'Резистор',
    hint: 'Через него течёт ток, на нём получается напряжение: U = I·R',
    ports: [
      { id: 'current', label: 'Сила тока', unit: UNITS.ampere, dir: 'in', group: 'electrical' },
      { id: 'voltage', label: 'Напряжение', unit: UNITS.volt, dir: 'out', group: 'electrical' },
      { id: 'power', label: 'Мощность', unit: UNITS.watt, dir: 'out', group: 'electrical', readonly: true },
    ],
    terminals: [
      { id: 'left', x: 12, y: 50, side: 'left', port: 'current', dir: 'in' },
      { id: 'right', x: 88, y: 50, side: 'right', port: 'voltage', dir: 'out' },
    ],
    params: [
      { id: 'resistance', label: 'Сопротивление', unit: UNITS.ohm, of: 'setting', min: 1, max: 100, step: 1, value: 10 },
    ],
    compute: ({ inputs, params }) => {
      const current = inputs.current ?? null
      const resistance = params.resistance ?? 1
      if (current === null) return { voltage: null, power: null }

      const voltage = current * resistance
      return { voltage, power: voltage * current }
    },
    view: ({ params, inputs }) => {
      const current = inputs.current ?? null
      const heat = current === null ? 0 : clamp(Math.abs(current) / 3, 0, 1)

      return (
        <g>
          <rect x={28} y={38} width={44} height={24} rx={1} {...STROKE} />
          <path d="M28 50H12M72 50h16" {...STROKE} />
          <rect x={28} y={38} width={44} height={24} rx={1} fill={ACCENT} opacity={heat * 0.35} />
          <text x={50} y={78} textAnchor="middle" fontSize={11} fill={INK}>
            {params.resistance ?? 0} Ом
          </text>
        </g>
      )
    },
  },
  {
    key: 'voltmeter',
    domain: 'electricity',
    title: 'Вольтметр',
    hint: 'Показывает напряжение на участке: подключается параллельно нагрузке',
    ports: [
      { id: 'in', label: 'Напряжение', unit: UNITS.volt, dir: 'in', group: 'electrical', modifier: true, passthrough: true },
      { id: 'out', label: 'Напряжение', unit: UNITS.volt, dir: 'out', group: 'electrical' },
    ],
    terminals: [
      { id: 'left', x: 10, y: 50, side: 'left', port: 'in', dir: 'in' },
      { id: 'right', x: 90, y: 50, side: 'right', port: 'out', dir: 'out' },
    ],
    params: [
      { id: 'limit', label: 'Предел измерения', unit: UNITS.volt, of: 'setting', min: 1, max: 100, step: 1, value: 15 },
    ],
    compute: ({ inputs, params }) => {
      const value = inputs.in ?? null
      if (value === null) return { out: null }

      const limit = params.limit ?? 1
      return { out: Math.abs(value) > limit ? Math.sign(value) * limit : value }
    },
    view: ({ outputs, inputs, params }) => (
      <g>
        {dial({ value: outputs.out ?? inputs.in ?? null, limit: params.limit ?? 1, letter: 'V' })}
        <text x={50} y={12} textAnchor="middle" fontSize={12} fill={INK}>
          {outputs.out === null || outputs.out === undefined ? '—' : `${outputs.out.toFixed(2)} В`}
        </text>
      </g>
    ),
  },
  {
    key: 'lamp',
    domain: 'electricity',
    title: 'Лампа',
    hint: 'Светится тем ярче, чем больше мощность на ней',
    ports: [
      { id: 'voltage', label: 'Напряжение', unit: UNITS.volt, dir: 'in', group: 'electrical', modifier: true },
      { id: 'power', label: 'Мощность', unit: UNITS.watt, dir: 'out', group: 'electrical' },
    ],
    terminals: [
      { id: 'left', x: 12, y: 50, side: 'left', port: 'voltage', dir: 'in' },
      { id: 'right', x: 88, y: 50, side: 'right', port: 'power', dir: 'out' },
    ],
    params: [
      { id: 'power', label: 'Номинальная мощность', unit: UNITS.watt, of: 'setting', min: 1, max: 100, step: 1, value: 20 },
      { id: 'nominal', label: 'Номинальное напряжение', unit: UNITS.volt, of: 'setting', min: 1, max: 24, step: 0.5, value: 12 },
    ],
    compute: ({ inputs, params }) => {
      const voltage = inputs.voltage ?? null
      if (voltage === null) return { power: null }

      const rated = params.power ?? 0
      const nominal = params.nominal ?? 0
      const share = nominal > 0 ? clamp(Math.abs(voltage) / nominal, 0, 1) : 0

      return { power: rated * share }
    },
    view: ({ outputs, params }) => {
      const load = outputs.power === null || outputs.power === undefined ? 0 : clamp(outputs.power / 100, 0, 1)

      return (
        <g>
          <circle cx={50} cy={50} r={28} {...STROKE} />
          <path d="M36 36l28 28M64 36L36 64" {...STROKE} />
          <circle cx={50} cy={50} r={20 + load * 16} fill={ACCENT} opacity={load * 0.45} />
          <text x={50} y={88} textAnchor="middle" fontSize={11} fill={INK}>
            {outputs.power === null || outputs.power === undefined ? '—' : `${outputs.power.toFixed(1)} Вт`}
          </text>
          <text x={50} y={100} textAnchor="middle" fontSize={9} fill={INK} opacity={0.6}>
            {params.power ?? 0} Вт ном.
          </text>
        </g>
      )
    },
  },
  {
    key: 'capacitor',
    domain: 'electricity',
    title: 'Конденсатор',
    hint: 'Ёмкость конденсатора',
    ports: [{ id: 'out', label: 'Ёмкость', unit: UNITS.microfarad, dir: 'out', group: 'electrical' }],
    terminals: [{ id: 'right', x: 86, y: 50, side: 'right', port: 'out', dir: 'out' }],
    params: [
      { id: 'capacitance', label: 'Ёмкость', unit: UNITS.microfarad, of: 'control', min: 1, max: 2000, step: 1, value: 100 },
    ],
    compute: ({ params }) => ({ out: (params.capacitance ?? 0) * UNITS.microfarad.factor }),
    view: ({ params }) => (
      <g>
        <path d="M42 26v48M58 26v48" {...STROKE} />
        <path d="M42 50H14M58 50h28" {...STROKE} />
        <text x={50} y={88} textAnchor="middle" fontSize={11} fill={INK}>
          {params.capacitance ?? 0} мкФ
        </text>
      </g>
    ),
  },
  {
    key: 'coil',
    domain: 'electricity',
    title: 'Катушка индуктивности',
    hint: 'Индуктивность по числу витков и размерам',
    ports: [{ id: 'out', label: 'Индуктивность', unit: UNITS.henry, dir: 'out', group: 'electrical' }],
    terminals: [{ id: 'right', x: 86, y: 50, side: 'right', port: 'out', dir: 'out' }],
    params: [
      { id: 'turns', label: 'Число витков', unit: UNITS.degree, of: 'control', min: 10, max: 500, step: 10, value: 100 },
      { id: 'diameter', label: 'Диаметр', unit: UNITS.millimetre, of: 'control', min: 5, max: 100, step: 1, value: 20 },
      { id: 'length', label: 'Длина намотки', unit: UNITS.centimetre, of: 'control', min: 1, max: 50, step: 1, value: 10 },
    ],
    compute: ({ params }) => {
      const mu0 = 4 * Math.PI * 1e-7
      const turns = params.turns ?? 0
      const diameter = (params.diameter ?? 0) / 1000
      const length = (params.length ?? 0) / 100
      if (length <= 0) return { out: null }

      const area = (Math.PI * diameter * diameter) / 4
      return { out: (mu0 * turns * turns * area) / length }
    },
    view: ({ params }) => (
      <g>
        <path d="M26 40c0-8 8-8 8 0s8 8 8 0 8-8 8 0 8 8 8 0 8-8 8 0" {...STROKE} />
        <path d="M26 60c0-8 8-8 8 0s8 8 8 0 8-8 8 0 8 8 8 0 8-8 8 0" {...STROKE} />
        <path d="M26 32v36M90 32v36" {...STROKE} />
        <text x={50} y={88} textAnchor="middle" fontSize={10} fill={INK}>
          {params.turns ?? 0} вит.
        </text>
      </g>
    ),
  },
  {
    key: 'oscillator',
    domain: 'electricity',
    title: 'Колебательный контур',
    hint: 'Входы — индуктивность и ёмкость, выход один: частота по формуле Томпсона',
    ports: [
      { id: 'inductance', label: 'Индуктивность', unit: UNITS.henry, dir: 'in', group: 'electrical' },
      { id: 'capacitance', label: 'Ёмкость', unit: UNITS.farad, dir: 'in', group: 'electrical' },
      { id: 'out', label: 'Частота', unit: UNITS.hertz, dir: 'out', group: 'electrical', readonly: true },
    ],
    terminals: [
      { id: 'bottom', x: 50, y: 88, side: 'down', port: 'inductance', dir: 'in' },
      { id: 'left', x: 12, y: 40, side: 'left', port: 'capacitance', dir: 'in' },
      { id: 'right', x: 88, y: 50, side: 'right', port: 'out', dir: 'out' },
    ],
    params: [],
    compute: ({ inputs }) => {
      const inductance = inputs.inductance ?? null
      const capacitance = inputs.capacitance ?? null
      if (!inductance || !capacitance) return { out: null }

      return { out: 1 / (2 * Math.PI * Math.sqrt(inductance * capacitance)) }
    },
    view: ({ outputs, time, running }) => {
      const frequency = outputs.out ?? 0
      const phase = running ? time * Math.min(frequency, 20) * Math.PI * 2 : 0
      const wave = Array.from({ length: 41 }, (_, index) => {
        const x = 10 + index * 2
        const y = 50 - Math.sin(phase + index * 0.35) * 18
        return `${index === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`
      }).join(' ')

      return (
        <g>
          <path d={wave} fill="none" stroke={ACCENT} strokeWidth={2.5} />
          <text x={50} y={88} textAnchor="middle" fontSize={11} fill={INK}>
            {frequency > 0 ? `${frequency.toFixed(1)} Гц` : '—'}
          </text>
        </g>
      )
    },
  },
]

export const mechanicsComponents: ComponentSpec[] = [
  {
    key: 'dynamometer',
    domain: 'mechanics',
    title: 'Динамометр',
    hint: 'Задаёт силу и показывает её значение',
    ports: [
      { id: 'out', label: 'Сила', unit: UNITS.newton, dir: 'out', group: 'mechanical' },
      { id: 'stretch', label: 'Растяжение', unit: UNITS.metre, dir: 'out', group: 'geometric' },
    ],
    terminals: [
      { id: 'right', x: 80, y: 50, side: 'right', port: 'out', dir: 'out' },
      { id: 'top', x: 50, y: 12, side: 'up', port: 'stretch', dir: 'out' },
    ],
    params: [
      { id: 'force', label: 'Приложенная сила', unit: UNITS.newton, of: 'control', min: 0, max: 20, step: 0.05, value: 2 },
      { id: 'limit', label: 'Предел измерения', unit: UNITS.newton, of: 'setting', min: 1, max: 30, step: 1, value: 10 },
    ],
    compute: ({ params }) => {
      const force = params.force ?? 0
      return { out: force, stretch: force / 100 }
    },
    view: ({ params }) => {
      const share = clamp((params.force ?? 0) / (params.limit ?? 1), 0, 1)

      return (
        <g>
          <rect x={38} y={12} width={24} height={58} rx={5} {...STROKE} />
          <line x1={44} y1={tickY(0)} x2={56} y2={tickY(0)} {...STROKE} />
          <rect x={41} y={tickY(share) - 3} width={18} height={6} fill={ACCENT} />
          <path d="M50 70v12" {...STROKE} />
          <path d="M50 82a5 5 0 1 0 0.1 0" {...STROKE} />
          <text x={50} y={100} textAnchor="middle" fontSize={11} fill={INK}>
            {(params.force ?? 0).toFixed(2)} Н
          </text>
        </g>
      )
    },
  },
  {
    key: 'spring',
    domain: 'mechanics',
    title: 'Пружина',
    hint: 'Вход — растяжение, выход один: сила упругости F = k·x',
    ports: [
      { id: 'stretch', label: 'Растяжение', unit: UNITS.metre, dir: 'in', group: 'geometric' },
      { id: 'out', label: 'Сила упругости', unit: UNITS.newton, dir: 'out', group: 'mechanical' },
    ],
    terminals: [
      { id: 'left', x: 16, y: 50, side: 'left', port: 'stretch', dir: 'in' },
      { id: 'right', x: 84, y: 50, side: 'right', port: 'out', dir: 'out' },
    ],
    params: [
      { id: 'stiffness', label: 'Жёсткость', unit: UNITS.newtonPerMetre, of: 'setting', min: 1, max: 1000, step: 1, value: 100 },
      { id: 'stretch', label: 'Растяжение', unit: UNITS.centimetre, of: 'control', min: 0, max: 50, step: 1, value: 5 },
    ],
    compute: ({ inputs, params }) => {
      const stretch = inputs.stretch ?? (params.stretch ?? 0) / 100
      return { out: (params.stiffness ?? 0) * stretch }
    },
    view: ({ outputs, params }) => {
      const length = clamp((params.stretch ?? 0) / 50, 0, 1)
      const coils = 6
      const width = 40 + length * 40
      const path = Array.from({ length: coils * 2 + 1 }, (_, index) => {
        const x = 20 + (index * width) / (coils * 2)
        const y = index % 2 === 0 ? 40 : 60
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y}`
      }).join(' ')

      return (
        <g>
          <path d={path} {...STROKE} />
          <path d="M20 34v32M20 50H8" {...STROKE} />
          <text x={50} y={90} textAnchor="middle" fontSize={11} fill={INK}>
            {outputs.out === null || outputs.out === undefined ? '—' : `${outputs.out.toFixed(1)} Н`}
          </text>
        </g>
      )
    },
  },
  {
    key: 'block',
    domain: 'mechanics',
    title: 'Брусок на поверхности',
    hint: 'Вход — сила, выходы: скорость и пройденный путь',
    ports: [
      { id: 'force', label: 'Сила', unit: UNITS.newton, dir: 'in', group: 'mechanical' },
      { id: 'speed', label: 'Скорость', unit: UNITS.metrePerSecond, dir: 'out', group: 'optical' },
      { id: 'distance', label: 'Пройденный путь', unit: UNITS.metre, dir: 'out', group: 'geometric', readonly: true },
    ],
    terminals: [
      { id: 'left', x: 18, y: 50, side: 'left', port: 'force', dir: 'in' },
      { id: 'right', x: 84, y: 62, side: 'right', port: 'speed', dir: 'out' },
    ],
    params: [
      { id: 'mass', label: 'Масса', unit: UNITS.kilogram, of: 'setting', min: 0.05, max: 5, step: 0.05, value: 0.5 },
      { id: 'mu', label: 'Коэффициент трения', unit: UNITS.degree, of: 'setting', min: 0, max: 1, step: 0.01, value: 0.3 },
    ],
    compute: ({ inputs, params, time }) => {
      const force = inputs.force ?? null
      const mass = params.mass ?? 1
      const mu = params.mu ?? 0

      if (force === null || mass === 0) return { speed: null, distance: null }

      const friction = mu * mass * 9.8
      const active = Math.max(0, force - friction)
      const speed = active / mass

      return { speed, distance: speed * time }
    },
    view: ({ outputs, params, time, running }) => {
      const speed = outputs.speed ?? 0
      const distance = running ? speed * time : 0
      const offset = clamp((distance * 8) % 60, 0, 34)

      return (
        <g>
          <path d="M6 72h88" {...STROKE} />
          <path d="M14 72l-6 7M30 72l-6 7M46 72l-6 7M62 72l-6 7M78 72l-6 7M94 72l-6 7" {...STROKE} opacity={0.5} />
          <rect x={10 + offset} y={46} width={34} height={26} rx={2} {...STROKE} fill="var(--lab-paper, #fff)" />
          <text x={27 + offset} y={63} textAnchor="middle" fontSize={9} fill={INK}>
            {params.mass ?? 0} кг
          </text>
          {speed > 0 ? (
            <path
              d={`M${48 + offset} 58h14m0 0l-5-4m5 4l-5 4`}
              fill="none"
              stroke={ACCENT}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          ) : null}
          <text x={50} y={94} textAnchor="middle" fontSize={11} fill={INK}>
            {speed > 0 ? `${speed.toFixed(2)} м/с` : 'покой'}
          </text>
        </g>
      )
    },
  },
  {
    key: 'pendulum',
    domain: 'mechanics',
    title: 'Нитяной маятник',
    hint: 'Выход — период колебаний T = 2π√(l/g)',
    ports: [{ id: 'out', label: 'Период', unit: UNITS.second, dir: 'out', group: 'time' }],
    terminals: [{ id: 'top', x: 50, y: 12, side: 'up', port: 'out', dir: 'out' }],
    params: [
      { id: 'length', label: 'Длина нити', unit: UNITS.centimetre, of: 'control', min: 10, max: 300, step: 5, value: 100 },
      { id: 'amplitude', label: 'Начальный угол', unit: UNITS.degree, of: 'control', min: 1, max: 30, step: 1, value: 12 },
    ],
    compute: ({ params }) => {
      const length = (params.length ?? 0) / 100
      if (length <= 0) return { out: null }

      return { out: 2 * Math.PI * Math.sqrt(length / 9.8) }
    },
    view: ({ outputs, params, time, running }) => {
      const period = outputs.out ?? 0
      const amplitude = params.amplitude ?? 12
      const phase = running && period > 0 ? (time / period) * Math.PI * 2 : 0
      const angle = (amplitude * Math.sin(phase) * Math.PI) / 180
      const rodLength = clamp((params.length ?? 100) / 4, 24, 62)

      const x = 50 + Math.sin(angle) * rodLength
      const y = 14 + Math.cos(angle) * rodLength

      return (
        <g>
          <path d="M22 14h56" {...STROKE} />
          <line x1={50} y1={14} x2={x} y2={y} {...STROKE} />
          <circle cx={x} cy={y} r={9} {...STROKE} fill="var(--lab-paper, #fff)" />
          <path
            d={`M${50 - Math.sin((amplitude * Math.PI) / 180) * rodLength} ${14 + Math.cos((amplitude * Math.PI) / 180) * rodLength}
                A ${rodLength} ${rodLength} 0 0 1 ${50 + Math.sin((amplitude * Math.PI) / 180) * rodLength} ${14 + Math.cos((amplitude * Math.PI) / 180) * rodLength}`}
            fill="none"
            stroke={ACCENT}
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.5}
          />
          <text x={50} y={96} textAnchor="middle" fontSize={11} fill={INK}>
            {period > 0 ? `T = ${period.toFixed(2)} с` : '—'}
          </text>
        </g>
      )
    },
  },
]

export const thermalComponents: ComponentSpec[] = [
  {
    key: 'timer',
    domain: 'thermal',
    title: 'Секундомер',
    hint: 'Задаёт время опыта. Его можно соединить с любым прибором, которому нужно время',
    ports: [{ id: 'out', label: 'Время опыта', unit: UNITS.second, dir: 'out', group: 'time', modifier: true }],
    terminals: [{ id: 'right', x: 80, y: 50, side: 'right', port: 'out', dir: 'out' }],
    params: [
      { id: 'duration', label: 'Время опыта', unit: UNITS.second, of: 'control', min: 0, max: 1800, step: 5, value: 60 },
    ],
    compute: ({ params }) => ({ out: params.duration ?? 0 }),
    view: ({ params }) => (
      <g>
        <circle cx={50} cy={50} r={30} {...STROKE} />
        <path d="M50 50V32" {...STROKE} />
        <path d="M50 50h13" {...STROKE} />
        <path d="M42 12h16M50 12v8" {...STROKE} />
        <text x={50} y={94} textAnchor="middle" fontSize={11} fill={INK}>
          {params.duration ?? 0} с
        </text>
      </g>
    ),
  },
  {
    key: 'heater',
    domain: 'thermal',
    title: 'Нагреватель',
    hint: 'Вход — сила тока, выходы: мощность и тепло',
    ports: [
      { id: 'current', label: 'Сила тока', unit: UNITS.ampere, dir: 'in', group: 'electrical' },
      { id: 'power', label: 'Мощность', unit: UNITS.watt, dir: 'out', group: 'electrical' },
    ],
    terminals: [
      { id: 'left', x: 12, y: 50, side: 'left', port: 'current', dir: 'in' },
      { id: 'right', x: 88, y: 50, side: 'right', port: 'power', dir: 'out' },
    ],
    params: [
      { id: 'resistance', label: 'Сопротивление спирали', unit: UNITS.ohm, of: 'setting', min: 1, max: 200, step: 1, value: 10 },
    ],
    compute: ({ inputs, params }) => {
      const current = inputs.current ?? null
      const resistance = params.resistance ?? 1
      if (current === null || resistance === 0) return { power: null }

      return { power: current * current * resistance }
    },
    view: ({ outputs, time, running }) => {
      const power = outputs.power ?? 0
      const heat = clamp(power / 200, 0, 1)
      const flicker = running ? 0.85 + 0.15 * Math.sin(time * 6) : 1

      return (
        <g>
          <rect x={22} y={40} width={56} height={34} rx={5} {...STROKE} />
          <path d="M32 62c4-10 8 10 12 0s8 10 12 0 8 10 12 0" stroke={ACCENT} strokeWidth={3} fill="none" opacity={0.4 + heat * 0.6 * flicker} />
          <path d="M40 30c0-6 6-6 6-12M56 30c0-6 6-6 6-12" {...STROKE} opacity={heat * flicker} />
          <text x={50} y={90} textAnchor="middle" fontSize={11} fill={INK}>
            {outputs.power === null || outputs.power === undefined ? '—' : `${outputs.power.toFixed(1)} Вт`}
          </text>
        </g>
      )
    },
  },
  {
    key: 'body',
    domain: 'thermal',
    title: 'Тело',
    hint: 'Входы — мощность нагрева и время; выход — температура тела',
    ports: [
      { id: 'power', label: 'Мощность нагрева', unit: UNITS.watt, dir: 'in', group: 'electrical', modifier: true },
      { id: 'time', label: 'Время нагрева', unit: UNITS.second, dir: 'in', group: 'time', modifier: true },
      { id: 'out', label: 'Температура', unit: UNITS.celsius, dir: 'out', group: 'thermal' },
    ],
    terminals: [
      { id: 'left', x: 14, y: 50, side: 'left', port: 'power', dir: 'in' },
      { id: 'bottom', x: 50, y: 86, side: 'down', port: 'time', dir: 'in' },
      { id: 'right', x: 84, y: 50, side: 'right', port: 'out', dir: 'out' },
    ],
    params: [
      { id: 'mass', label: 'Масса', unit: UNITS.kilogram, of: 'setting', min: 0.01, max: 5, step: 0.01, value: 0.05 },
      { id: 'capacity', label: 'Удельная теплоёмкость', unit: UNITS.joulePerKilogramKelvin, of: 'setting', min: 100, max: 5000, step: 10, value: 400 },
      { id: 'start', label: 'Начальная температура', unit: UNITS.celsius, of: 'control', min: 0, max: 40, step: 1, value: 20 },
    ],
    compute: ({ inputs, params, time }) => {
      const mass = params.mass ?? 0
      const capacity = params.capacity ?? 0
      const start = params.start ?? 0
      const celsiusOffset = UNITS.celsius.offset ?? 0
      const base = start + celsiusOffset

      if (mass === 0 || capacity === 0) return { out: null }

      const power = inputs.power ?? 0
      const duration = inputs.time ?? time

      return { out: base + (power * duration) / (capacity * mass) }
    },
    view: ({ outputs, params, time, running }) => {
      const celsiusOffset = UNITS.celsius.offset ?? 0
      const temperature = (outputs.out ?? (params.start ?? 20) + celsiusOffset) - celsiusOffset
      const heat = clamp((temperature - 20) / 60, 0, 1)
      const pulse = running ? 1 + 0.02 * Math.sin(time * 3) : 1

      return (
        <g>
          <rect
            x={26}
            y={28}
            width={48}
            height={48}
            rx={6}
            opacity={heat * 0.5 * pulse}
            {...STROKE}
            fill={heat > 0 ? ACCENT : 'var(--lab-paper, #fff)'}
          />
          <path d="M40 28c0-8 20-8 20 0" {...STROKE} />
          <text x={50} y={58} textAnchor="middle" fontSize={13} fill={INK}>
            {temperature.toFixed(1)}°
          </text>
          <text x={50} y={90} textAnchor="middle" fontSize={10} fill={INK} opacity={0.8}>
            {params.mass ?? 0} кг
          </text>
        </g>
      )
    },
  },
  {
    key: 'thermometer',
    domain: 'thermal',
    title: 'Термометр',
    hint: 'Вход — температура, выход один: показание прибора',
    ports: [
      { id: 'in', label: 'Температура', unit: UNITS.celsius, dir: 'in', group: 'thermal' },
      { id: 'out', label: 'Показание', unit: UNITS.celsius, dir: 'out', group: 'thermal' },
    ],
    terminals: [
      { id: 'left', x: 20, y: 50, side: 'left', port: 'in', dir: 'in' },
      { id: 'right', x: 80, y: 50, side: 'right', port: 'out', dir: 'out' },
    ],
    params: [
      { id: 'limit', label: 'Верхний предел', unit: UNITS.celsius, of: 'setting', min: 20, max: 200, step: 5, value: 100 },
    ],
    compute: ({ inputs, params }) => {
      const value = inputs.in ?? null
      if (value === null) return { out: null }

      return { out: Math.min(value, (params.limit ?? 100) + (UNITS.celsius.offset ?? 0)) }
    },
    view: ({ outputs, params }) => {
      const celsiusOffset = UNITS.celsius.offset ?? 0
      const limit = params.limit ?? 100
      const base = outputs.out ?? null
      const value = base === null ? null : base - celsiusOffset
      const share = value === null ? 0 : clamp((value - 0) / limit, 0, 1)

      return (
        <g>
          <rect x={44} y={14} width={12} height={54} rx={6} {...STROKE} />
          <circle cx={50} cy={74} r={9} {...STROKE} />
          <rect x={46} y={14 + 54 * (1 - share)} width={8} height={54 * share + 8} fill={ACCENT} />
          <text x={50} y={98} textAnchor="middle" fontSize={11} fill={INK}>
            {value === null ? '—' : `${value.toFixed(1)} °C`}
          </text>
        </g>
      )
    },
  },
]

export const opticsComponents: ComponentSpec[] = [
  {
    key: 'laser',
    domain: 'optics',
    title: 'Источник луча',
    hint: 'Выход — угол луча; длина волны задаётся параметром',
    ports: [
      { id: 'angle', label: 'Угол луча', unit: UNITS.degree, dir: 'out', group: 'optical' },
      { id: 'wavelength', label: 'Длина волны', unit: UNITS.nanometre, dir: 'out', group: 'geometric', readonly: true },
    ],
    terminals: [{ id: 'right', x: 88, y: 50, side: 'right', port: 'angle', dir: 'out' }],
    params: [
      { id: 'wavelength', label: 'Длина волны', unit: UNITS.nanometre, of: 'control', min: 380, max: 780, step: 5, value: 650 },
      { id: 'angle', label: 'Угол', unit: UNITS.degree, of: 'control', min: 0, max: 80, step: 1, value: 30 },
    ],    compute: ({ params }) => ({
      angle: params.angle ?? 0,
      wavelength: (params.wavelength ?? 0) * UNITS.nanometre.factor,
    }),
    view: ({ params }) => (
      <g>
        <rect x={18} y={36} width={44} height={28} rx={5} {...STROKE} />
        <path d="M62 50h26" stroke={wavelengthColor(params.wavelength ?? 650)} strokeWidth={3} />
        <text x={40} y={78} textAnchor="middle" fontSize={10} fill={INK}>
          {params.wavelength ?? 0} нм
        </text>
      </g>
    ),
  },
  {
    key: 'mirror',
    domain: 'optics',
    title: 'Плоское зеркало',
    hint: 'Вход — угол падения, выход — угол отражения',
    ports: [
      { id: 'angle', label: 'Угол падения', unit: UNITS.degree, dir: 'in', group: 'optical' },
      { id: 'out', label: 'Угол отражения', unit: UNITS.degree, dir: 'out', group: 'optical' },
    ],
    terminals: [
      { id: 'left', x: 18, y: 40, side: 'left', port: 'angle', dir: 'in' },
      { id: 'right', x: 82, y: 60, side: 'right', port: 'out', dir: 'out' },
    ],
    params: [
      { id: 'tilt', label: 'Наклон зеркала', unit: UNITS.degree, of: 'control', min: -45, max: 45, step: 1, value: 0 },
    ],
    compute: ({ inputs, params }) => {
      const angle = inputs.angle ?? null
      if (angle === null) return { out: null }

      return { out: clamp(Math.abs(angle) + 2 * (params.tilt ?? 0), 0, 89) }
    },
    view: ({ params }) => {
      const tilt = params.tilt ?? 0
      const radians = (tilt * Math.PI) / 180

      return (
        <g>
          <line
            x1={50 - Math.sin(radians) * 34}
            y1={50 + Math.cos(radians) * 34}
            x2={50 + Math.sin(radians) * 34}
            y2={50 - Math.cos(radians) * 34}
            {...STROKE}
          />
          <path d="M12 12h24" stroke={ACCENT} strokeWidth={2} opacity={0.5} />
          <path d="M64 84h24" stroke={ACCENT} strokeWidth={2} opacity={0.5} />
          <text x={50} y={96} textAnchor="middle" fontSize={10} fill={INK}>
            {tilt}°
          </text>
        </g>
      )
    },
  },
  {
    key: 'lens',
    domain: 'optics',
    title: 'Тонкая линза',
    hint: 'Вход — расстояние до предмета, выходы: расстояние до изображения и увеличение',
    ports: [
      { id: 'distance', label: 'Расстояние до предмета', unit: UNITS.metre, dir: 'in', group: 'geometric' },
      { id: 'image', label: 'Расстояние до изображения', unit: UNITS.metre, dir: 'out', group: 'geometric' },
      { id: 'magnification', label: 'Увеличение', unit: UNITS.degree, dir: 'out', group: 'other', readonly: true },
    ],
    terminals: [
      { id: 'left', x: 16, y: 50, side: 'left', port: 'distance', dir: 'in' },
      { id: 'right', x: 84, y: 50, side: 'right', port: 'image', dir: 'out' },
    ],
    params: [
      { id: 'focus', label: 'Фокусное расстояние', unit: UNITS.metre, of: 'control', min: 0.05, max: 2, step: 0.01, value: 0.2 },
      { id: 'distance', label: 'Предмет', unit: UNITS.metre, of: 'control', min: 0.05, max: 3, step: 0.01, value: 0.6 },
    ],
    compute: ({ inputs, params }) => {
      const focus = params.focus ?? 0
      const distance = inputs.distance ?? params.distance ?? null
      if (distance === null || focus === 0 || distance === focus) return { image: null, magnification: null }

      const image = 1 / (1 / focus - 1 / distance)
      return { image, magnification: -image / distance }
    },
    view: ({ outputs, params }) => {
      const focus = params.focus ?? 0.2
      const image = outputs.image ?? null
      const focusPixels = clamp(focus * 60, 6, 34)
      const imagePixels = image === null ? 34 : clamp(image * 60, 6, 46)

      return (
        <g>
          <ellipse cx={50} cy={50} rx={7} ry={26} {...STROKE} />
          <line x1={8} y1={50} x2={92} y2={50} stroke="currentColor" strokeWidth={1} opacity={0.3} />
          <path d={`M8 30h42L50 50l${imagePixels} ${image === null || image < 0 ? -20 : 20}`} fill="none" stroke={ACCENT} strokeWidth={2} />
          <path d="M8 70h42" fill="none" stroke={ACCENT} strokeWidth={2} opacity={0.6} />
          <circle cx={50 + focusPixels} cy={50} r={2.5} fill={ACCENT} />
          <text x={50} y={92} textAnchor="middle" fontSize={10} fill={INK}>
            f = {focus.toFixed(2)} м
          </text>
        </g>
      )
    },
  },
  {
    key: 'screen',
    domain: 'optics',
    title: 'Экран',
    hint: 'Вход — расстояние до изображения, выход — резкость картинки',
    ports: [
      { id: 'image', label: 'Расстояние до изображения', unit: UNITS.metre, dir: 'in', group: 'geometric' },
      { id: 'out', label: 'Резкость', unit: UNITS.degree, dir: 'out', group: 'other' },
    ],
    terminals: [
      { id: 'left', x: 16, y: 46, side: 'left', port: 'image', dir: 'in' },
      { id: 'right', x: 84, y: 54, side: 'right', port: 'out', dir: 'out' },
    ],
    params: [
      { id: 'position', label: 'Положение экрана', unit: UNITS.metre, of: 'control', min: 0.1, max: 3, step: 0.01, value: 0.4 },
    ],
    compute: ({ inputs, params }) => {
      const image = inputs.image ?? null
      const position = params.position ?? null
      if (image === null || position === null) return { out: null }

      const shift = position - image
      const sharpness = Math.max(0, 100 * (1 - Math.abs(shift) / Math.max(Math.abs(image), 0.05)))
      return { out: sharpness }
    },
    view: ({ outputs }) => {
      const sharpness = outputs.out ?? 0
      const blur = 1 - clamp(sharpness / 100, 0, 1)

      return (
        <g>
          <rect x={30} y={20} width={40} height={56} rx={3} {...STROKE} />
          <circle cx={50} cy={48} r={4 + blur * 14} fill={ACCENT} opacity={0.35 + (1 - blur) * 0.5} />
          <text x={50} y={90} textAnchor="middle" fontSize={10} fill={INK}>
            {outputs.out === null || outputs.out === undefined ? '—' : `${sharpness.toFixed(0)}%`}
          </text>
        </g>
      )
    },
  },
]

function tickY(share: number): number {
  return 66 - clamp(share, 0, 1) * 50
}

export function wavelengthColor(nanometres: number): string {
  if (nanometres < 450) return '#7a3cff'
  if (nanometres < 495) return '#1f6dff'
  if (nanometres < 570) return '#19b34a'
  if (nanometres < 590) return '#e8c31a'
  if (nanometres < 620) return '#f07c1a'
  return '#e03131'
}

export const LIBRARY: ComponentSpec[] = [
  ...mechanicsComponents,
  ...electricityComponents,
  ...thermalComponents,
  ...opticsComponents,
]

export type { ViewProps }
