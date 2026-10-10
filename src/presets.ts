import { combineRgb, type CompanionOptionValues, type CompanionPresetDefinitions } from '@companion-module/base'
import { RED, GREEN, WHITE } from './feedbacks.js'

/**
 * Ready-made buttons: one per input (1–16) that loads it on preview and lights green on preview and red on air, plus
 * the switcher controls. Companion rewrites the `$(projetech-studio:…)` prefix to the connection's label.
 */
export function getPresets(): CompanionPresetDefinitions {
	const presets: CompanionPresetDefinitions = {}
	for (let i = 1; i <= 16; i++) {
		presets[`input_${i}`] = {
			type: 'button',
			category: 'Inputs',
			name: `Input ${i}`,
			style: {
				text: `$(projetech-studio:input_${i}_name)\\n${i}`,
				size: '14',
				color: WHITE,
				bgcolor: combineRgb(40, 44, 56),
			},
			steps: [{ down: [{ actionId: 'previewInput', options: { input: i } }], up: [] }],
			feedbacks: [
				{
					feedbackId: 'tally',
					options: { input: i, which: 'preview' },
					style: { bgcolor: GREEN, color: WHITE },
				},
				{ feedbackId: 'tally', options: { input: i, which: 'program' }, style: { bgcolor: RED, color: WHITE } },
			],
		}
	}
	const simple = (
		id: string,
		text: string,
		actionId: string,
		options: CompanionOptionValues,
		feedbackId?: string,
		bg = combineRgb(40, 44, 56),
	) => {
		presets[id] = {
			type: 'button',
			category: 'Switcher',
			name: text,
			style: { text, size: '18', color: WHITE, bgcolor: bg },
			steps: [{ down: [{ actionId, options }], up: [] }],
			feedbacks: feedbackId ? [{ feedbackId, options: {}, style: { bgcolor: RED, color: WHITE } }] : [],
		}
	}
	simple('cut', 'CUT', 'cut', { input: 0 })
	simple('fade', 'FADE', 'fade', { input: 0, duration: 0 })
	simple('stop', 'STOP', 'stop', {})
	simple('ftb', 'FTB', 'fadeToBlack', {}, 'fadeToBlack')
	simple('rec', 'REC', 'recording', { cmd: 'StartStopRecording' }, 'recording')
	simple('stream', 'STREAM', 'streaming', { cmd: 'StartStopStreaming', slot: 0 }, 'streaming')
	simple('output', 'SAÍDA\\nLED', 'output', { cmd: 'Fullscreen' }, 'output')
	// One button per auxiliary output; Saída 2 keeps its preset id.
	for (const n of [2, 3, 4, 5]) {
		presets[n === 2 ? 'aux' : `aux_${n}`] = {
			type: 'button',
			category: 'Switcher',
			name: `SAÍDA ${n}`,
			style: { text: `SAÍDA ${n}`, size: '18', color: WHITE, bgcolor: combineRgb(40, 44, 56) },
			steps: [{ down: [{ actionId: 'aux', options: { output: n, cmd: 'StartStopExternal' } }], up: [] }],
			feedbacks: [{ feedbackId: 'aux', options: { output: n }, style: { bgcolor: RED, color: WHITE } }],
		}
	}

	// Master/slave link: the role of this computer (green MASTER, blue SLAVE) and the two takeovers.
	presets['sync_role'] = {
		type: 'button',
		category: 'Sincronia',
		name: 'Papel na sincronia',
		style: {
			text: '$(projetech-studio:sync_role)\\n$(projetech-studio:sync_partner)',
			size: '14',
			color: WHITE,
			bgcolor: combineRgb(40, 44, 56),
		},
		steps: [{ down: [], up: [] }],
		feedbacks: [
			{ feedbackId: 'syncRole', options: { role: 'master' }, style: { bgcolor: GREEN, color: WHITE } },
			{ feedbackId: 'syncRole', options: { role: 'slave' }, style: { bgcolor: combineRgb(47, 59, 232), color: WHITE } },
		],
	}
	presets['sync_takeover'] = {
		type: 'button',
		category: 'Sincronia',
		name: 'Assumir como master',
		style: { text: 'ASSUMIR\\nMASTER', size: '14', color: WHITE, bgcolor: combineRgb(120, 80, 0) },
		steps: [{ down: [{ actionId: 'syncTakeOver', options: {} }], up: [] }],
		feedbacks: [{ feedbackId: 'syncRole', options: { role: 'master' }, style: { bgcolor: GREEN, color: WHITE } }],
	}
	presets['sync_stream'] = {
		type: 'button',
		category: 'Sincronia',
		name: 'Assumir transmissão',
		style: { text: 'ASSUMIR\\nSTREAM', size: '14', color: WHITE, bgcolor: combineRgb(120, 0, 0) },
		steps: [{ down: [{ actionId: 'syncTakeStream', options: {} }], up: [] }],
		feedbacks: [{ feedbackId: 'streaming', options: {}, style: { bgcolor: RED, color: WHITE } }],
	}
	return presets
}
