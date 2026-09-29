import type { ReactNode } from 'react'
import type { Unit } from '@/physics/quantity'

export type DomainKey = 'mechanics' | 'electricity' | 'thermal' | 'optics'

export interface DomainSpec {
  key: DomainKey
  title: string
  hint: string
}

export const DOMAINS: DomainSpec[] = [
  { key: 'mechanics', title: 'Механика', hint: 'Силы, движение, колебания' },
  { key: 'electricity', title: 'Электрика', hint: 'Ток, напряжение, элементы цепи' },
  { key: 'thermal', title: 'Теплота', hint: 'Нагрев и температура' },
  { key: 'optics', title: 'Оптика', hint: 'Лучи, линзы, зеркала' },
]

export interface PortSpec {
  id: string
  label: string
  unit: Unit
  dir: 'in' | 'out'
}

export interface TerminalSpec {
  id: string
  x: number
  y: number
  side: 'left' | 'right' | 'up' | 'down'
  
  port: string
  dir: 'in' | 'out'
}

export interface ParamSpec {
  id: string
  label: string
  unit: Unit
  of: 'setting' | 'control'
  min: number
  max: number
  step: number
  value: number
}

export interface ComputeContext {
  
  inputs: Record<string, number | null>
  
  params: Record<string, number>
  
  time: number
}

export type ComputeResult = Record<string, number | null>

export interface ComponentSpec {
  key: string
  domain: DomainKey
  title: string
  hint: string
  ports: PortSpec[]
  terminals: TerminalSpec[]
  params: ParamSpec[]
  compute: (context: ComputeContext) => ComputeResult
  
  view?: (props: ViewProps) => ReactNode
}

export interface ViewProps {
  
  outputs: Record<string, number | null>
  
  inputs: Record<string, number | null>
  
  params: Record<string, number>
  
  time: number
  
  running: boolean
}

export function inputsOf(spec: ComponentSpec): PortSpec[] {
  return spec.ports.filter((port) => port.dir === 'in')
}

export function outputsOf(spec: ComponentSpec): PortSpec[] {
  return spec.ports.filter((port) => port.dir === 'out')
}

export function portOf(spec: ComponentSpec, portId: string): PortSpec | undefined {
  return spec.ports.find((port) => port.id === portId)
}

export function portOfTerminal(spec: ComponentSpec, terminalId: string): PortSpec | undefined {
  const terminal = spec.terminals.find((item) => item.id === terminalId)
  return terminal ? portOf(spec, terminal.port) : undefined
}

export function defaultParams(spec: ComponentSpec): Record<string, number> {
  const params: Record<string, number> = {}
  for (const param of spec.params) params[param.id] = param.value
  return params
}
