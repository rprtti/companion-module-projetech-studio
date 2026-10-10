import { combineRgb, type CompanionFeedbackDefinitions } from '@companion-module/base'
import type { StudioInstance } from './main.js'
import { auxOutputOption, auxOutputNumber } from './actions.js'

export const RED = combineRgb(200, 0, 0)
export const GREEN = combineRgb(0, 160, 0)
export const WHITE = combineRgb(255, 255, 255)
export const BLACK = combineRgb(0, 0, 0)

/**
 * Boolean feedbacks. Tally comes from the pushed vMix tally string (one digit per input: 0 off, 1 program, 2 preview);
 * the other flags come from activator pushes and the polled XML state.
 */
export function getFeedbacks(instance: StudioInstance): CompanionFeedbackDefinitions {
	const api = instance.api
	return {
		tally: {
			type: 'boolean',
			name: 'Tally do input',
			description: 'Verdadeiro quando o input está no ar (programa) ou no preview',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [
				{ type: 'number', id: 'input', label: 'Input', default: 1, min: 1, max: 999 },
				{
					type: 'dropdown',
					id: 'which',
					label: 'Estado',
					default: 'program',
					choices: [
						{ id: 'program', label: 'No ar (vermelho)' },
						{ id: 'preview', label: 'Preview (verde)' },
					],
				},
			],
			callback: (fb) => {
				const n = Number(fb.options.input)
				const digit = api.state.tally.charAt(n - 1)
				return fb.options.which === 'preview' ? digit === '2' : digit === '1'
			},
		},
		recording: {
			type: 'boolean',
			name: 'Gravando',
			description: 'Gravação do PGM em andamento',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [],
			callback: () => api.state.recording,
		},
		streaming: {
			type: 'boolean',
			name: 'Transmitindo',
			description: 'Pelo menos um stream no ar',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [],
			callback: () => api.state.streaming,
		},
		output: {
			type: 'boolean',
			name: 'Saída LED ligada',
			description: 'Janela de saída no monitor do LED',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [],
			callback: () => api.state.fullscreen,
		},
		aux: {
			type: 'boolean',
			name: 'Saída auxiliar ligada',
			description: 'Saída 2, 3, 4 ou 5 (multiview, input ou programa em outro monitor) ligada',
			defaultStyle: { bgcolor: combineRgb(18, 196, 248), color: BLACK },
			options: [auxOutputOption],
			callback: (fb) => api.auxActive(auxOutputNumber(fb.options.output)),
		},
		fadeToBlack: {
			type: 'boolean',
			name: 'Fade to black',
			description: 'Saída em preto',
			defaultStyle: { bgcolor: combineRgb(255, 152, 0), color: BLACK },
			options: [],
			callback: () => api.state.fadeToBlack,
		},
		syncRole: {
			type: 'boolean',
			name: 'Papel na sincronia é…',
			description: 'Sincronia master/slave: verdadeiro quando este Projetech Studio tem o papel escolhido',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [
				{
					type: 'dropdown',
					id: 'role',
					label: 'Papel',
					default: 'master',
					choices: [
						{ id: 'master', label: 'MASTER' },
						{ id: 'slave', label: 'SLAVE' },
						{ id: 'standalone', label: 'Independente' },
					],
				},
			],
			callback: (fb) => api.state.connected && api.state.sync.role === fb.options.role,
		},
		connected: {
			type: 'boolean',
			name: 'Conectado ao Projetech Studio',
			description: 'A conexão do Companion com este Projetech Studio está ativa',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [],
			callback: () => api.state.connected,
		},
	}
}
