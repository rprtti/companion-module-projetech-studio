import type { CompanionActionDefinitions } from '@companion-module/base'
import type { StudioInstance } from './main.js'

/**
 * Actions map to Projetech Studio API functions (same names and parameters as vMix functions, e.g. `Cut`, `Fade`,
 * `PreviewInput`, `SetVolume`). Inputs are numbered in the order of the Projetech Studio list, starting at 1.
 */

/** Input number option; for actions where it is optional, 0 means "the input on preview" (or the program). */
const inputOption = (label = 'Input (número na lista; 0 = o que está no preview)') => ({
	type: 'number' as const,
	id: 'input',
	label,
	default: 1,
	min: 0,
	max: 999,
})

export function getActions(instance: StudioInstance): CompanionActionDefinitions {
	const api = instance.api
	/** `Input=n` only when a specific input was chosen; without it the API acts on the preview/program input. */
	const withInput = (n: unknown): Record<string, number> => (Number(n) > 0 ? { Input: Number(n) } : {})

	return {
		cut: {
			name: 'Cut (take sem transição)',
			options: [inputOption()],
			callback: async (ev) => api.sendFunction('Cut', withInput(ev.options.input)),
		},
		fade: {
			name: 'Fade (crossfade)',
			options: [
				inputOption(),
				{
					type: 'number',
					id: 'duration',
					label: 'Duração (ms, 0 = padrão do projeto)',
					default: 0,
					min: 0,
					max: 10000,
				},
			],
			callback: async (ev) =>
				api.sendFunction('Fade', {
					...withInput(ev.options.input),
					Duration: Number(ev.options.duration) > 0 ? Number(ev.options.duration) : undefined,
				}),
		},
		previewInput: {
			name: 'Preview: carregar input',
			options: [inputOption('Input')],
			callback: async (ev) => api.sendFunction('PreviewInput', { Input: Number(ev.options.input) }),
		},
		take: {
			name: 'Take (input direto no ar, transição padrão)',
			options: [inputOption('Input')],
			callback: async (ev) => api.sendFunction('ActiveInput', { Input: Number(ev.options.input) }),
		},
		stop: {
			name: 'Stop (volta para a tela de espera)',
			options: [],
			callback: async () => api.sendFunction('Stop'),
		},
		fadeToBlack: {
			name: 'Fade to black (alternar)',
			options: [],
			callback: async () => api.sendFunction('FadeToBlack'),
		},
		playback: {
			name: 'Reprodução',
			options: [
				{
					type: 'dropdown',
					id: 'cmd',
					label: 'Comando',
					default: 'PlayPause',
					choices: [
						{ id: 'Play', label: 'Play' },
						{ id: 'Pause', label: 'Pausar' },
						{ id: 'PlayPause', label: 'Play / Pausa' },
						{ id: 'Restart', label: 'Reiniciar' },
					],
				},
				inputOption('Input (0 = programa)'),
			],
			callback: async (ev) => api.sendFunction(String(ev.options.cmd), withInput(ev.options.input)),
		},
		loop: {
			name: 'Loop do input',
			options: [
				{
					type: 'dropdown',
					id: 'cmd',
					label: 'Modo',
					default: 'Loop',
					choices: [
						{ id: 'Loop', label: 'Alternar' },
						{ id: 'LoopOn', label: 'Ligar' },
						{ id: 'LoopOff', label: 'Desligar' },
					],
				},
				inputOption('Input (0 = programa)'),
			],
			callback: async (ev) => api.sendFunction(String(ev.options.cmd), withInput(ev.options.input)),
		},
		overlay: {
			name: 'Overlay (sobre o PGM)',
			options: [
				{
					type: 'dropdown',
					id: 'cmd',
					label: 'Modo',
					default: 'OverlayInput1',
					choices: [
						{ id: 'OverlayInput1', label: 'Alternar' },
						{ id: 'OverlayInput1In', label: 'Ligar' },
						{ id: 'OverlayInput1Off', label: 'Desligar' },
					],
				},
				inputOption('Input'),
			],
			callback: async (ev) => api.sendFunction(String(ev.options.cmd), { Input: Number(ev.options.input) }),
		},
		overlayAllOff: {
			name: 'Desligar todos os overlays',
			options: [],
			callback: async () => api.sendFunction('OverlayInputAllOff'),
		},
		audio: {
			name: 'Áudio do input para o PGM',
			options: [
				{
					type: 'dropdown',
					id: 'cmd',
					label: 'Modo',
					default: 'Audio',
					choices: [
						{ id: 'Audio', label: 'Alternar' },
						{ id: 'AudioOn', label: 'Ligar' },
						{ id: 'AudioOff', label: 'Desligar' },
					],
				},
				inputOption('Input'),
			],
			callback: async (ev) => api.sendFunction(String(ev.options.cmd), { Input: Number(ev.options.input) }),
		},
		setVolume: {
			name: 'Volume do input',
			options: [
				inputOption('Input'),
				{ type: 'number', id: 'value', label: 'Volume (0–100)', default: 100, min: 0, max: 100 },
			],
			callback: async (ev) =>
				api.sendFunction('SetVolume', { Input: Number(ev.options.input), Value: Number(ev.options.value) }),
		},
		setMasterVolume: {
			name: 'Volume master',
			options: [{ type: 'number', id: 'value', label: 'Volume (0–100)', default: 100, min: 0, max: 100 }],
			callback: async (ev) => api.sendFunction('SetMasterVolume', { Value: Number(ev.options.value) }),
		},
		recording: {
			name: 'Gravação',
			options: [
				{
					type: 'dropdown',
					id: 'cmd',
					label: 'Comando',
					default: 'StartStopRecording',
					choices: [
						{ id: 'StartRecording', label: 'Iniciar' },
						{ id: 'StopRecording', label: 'Parar' },
						{ id: 'StartStopRecording', label: 'Alternar' },
					],
				},
			],
			callback: async (ev) => api.sendFunction(String(ev.options.cmd)),
		},
		streaming: {
			name: 'Streaming',
			options: [
				{
					type: 'dropdown',
					id: 'cmd',
					label: 'Comando',
					default: 'StartStopStreaming',
					choices: [
						{ id: 'StartStreaming', label: 'Iniciar' },
						{ id: 'StopStreaming', label: 'Parar' },
						{ id: 'StartStopStreaming', label: 'Alternar' },
					],
				},
				{
					type: 'number',
					id: 'slot',
					label: 'Stream (0 = todos, 1–3 = específico)',
					default: 0,
					min: 0,
					max: 3,
				},
			],
			callback: async (ev) =>
				api.sendFunction(
					String(ev.options.cmd),
					Number(ev.options.slot) > 0 ? { Value: Number(ev.options.slot) - 1 } : {},
				),
		},
		output: {
			name: 'Saída LED',
			options: [
				{
					type: 'dropdown',
					id: 'cmd',
					label: 'Comando',
					default: 'Fullscreen',
					choices: [
						{ id: 'Fullscreen', label: 'Alternar' },
						{ id: 'FullscreenOn', label: 'Ligar' },
						{ id: 'FullscreenOff', label: 'Desligar' },
					],
				},
			],
			callback: async (ev) => api.sendFunction(String(ev.options.cmd)),
		},
		aux: {
			name: 'Saída 2 (multiview / input)',
			options: [
				{
					type: 'dropdown',
					id: 'cmd',
					label: 'Comando',
					default: 'StartStopExternal',
					choices: [
						{ id: 'StartExternal', label: 'Ligar' },
						{ id: 'StopExternal', label: 'Desligar' },
						{ id: 'StartStopExternal', label: 'Alternar' },
					],
				},
			],
			callback: async (ev) => api.sendFunction(String(ev.options.cmd)),
		},
		timer: {
			name: 'Timer',
			options: [
				{
					type: 'dropdown',
					id: 'cmd',
					label: 'Comando',
					default: 'StartCountdown',
					choices: [
						{ id: 'StartCountdown', label: 'Iniciar' },
						{ id: 'PauseCountdown', label: 'Pausar' },
						{ id: 'StopCountdown', label: 'Zerar' },
						{ id: 'SetCountdown', label: 'Definir tempo' },
					],
				},
				{ type: 'textinput', id: 'value', label: 'Tempo (hh:mm:ss, só para "Definir")', default: '00:05:00' },
			],
			callback: async (ev) =>
				api.sendFunction(
					String(ev.options.cmd),
					ev.options.cmd === 'SetCountdown' ? { Value: String(ev.options.value) } : {},
				),
		},
		// Master/slave link: accepted on the slave too (every other command goes to the master).
		syncTakeOver: {
			name: 'Sincronia: assumir como master (no slave)',
			options: [],
			callback: async () => api.sendFunction('SyncTakeOver'),
		},
		syncTakeStream: {
			name: 'Sincronia: assumir a transmissão',
			options: [],
			callback: async () => api.sendFunction('SyncTakeStream'),
		},
		// Escape hatch for API functions without a dedicated action; the text is sent as typed.
		raw: {
			name: 'Função livre (FUNCTION da API)',
			options: [
				{ type: 'textinput', id: 'name', label: 'Função', default: 'Cut' },
				{ type: 'textinput', id: 'params', label: 'Parâmetros (Input=1&Value=50)', default: '' },
			],
			callback: async (ev) =>
				api.send(
					String(ev.options.params)
						? `FUNCTION ${ev.options.name} ${ev.options.params}`
						: `FUNCTION ${ev.options.name}`,
				),
		},
	}
}
