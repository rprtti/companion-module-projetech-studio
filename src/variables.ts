import type { CompanionVariableDefinition, CompanionVariableValues } from '@companion-module/base'
import type { StudioInstance } from './main.js'

const MAX_INPUTS = 32

export function getVariableDefinitions(): CompanionVariableDefinition[] {
	const defs: CompanionVariableDefinition[] = [
		{ variableId: 'active_number', name: 'Número do input no ar' },
		{ variableId: 'active_name', name: 'Nome do input no ar' },
		{ variableId: 'preview_number', name: 'Número do input no preview' },
		{ variableId: 'preview_name', name: 'Nome do input no preview' },
		{ variableId: 'program_remaining', name: 'Tempo restante do programa (mm:ss)' },
		{ variableId: 'recording', name: 'Gravando (1/0)' },
		{ variableId: 'streaming', name: 'Transmitindo (1/0)' },
	]
	for (let i = 1; i <= MAX_INPUTS; i++) defs.push({ variableId: `input_${i}_name`, name: `Nome do input ${i}` })
	return defs
}

const mmss = (ms: number): string => {
	const s = Math.max(0, Math.floor(ms / 1000))
	return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function getVariableValues(instance: StudioInstance): CompanionVariableValues {
	const st = instance.api.state
	const active = instance.api.inputByNumber(st.active)
	const preview = instance.api.inputByNumber(st.preview)
	const values: CompanionVariableValues = {
		active_number: st.active || '',
		active_name: active?.title ?? '',
		preview_number: st.preview || '',
		preview_name: preview?.title ?? '',
		program_remaining: active && active.duration > 0 ? mmss(active.duration - active.position) : '',
		recording: st.recording ? 1 : 0,
		streaming: st.streaming ? 1 : 0,
	}
	for (let i = 1; i <= MAX_INPUTS; i++) values[`input_${i}_name`] = instance.api.inputByNumber(i)?.title ?? ''
	return values
}
