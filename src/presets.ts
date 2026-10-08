import { combineRgb, type CompanionOptionValues, type CompanionPresetDefinitions } from '@companion-module/base'
import { RED, GREEN, WHITE } from './feedbacks.js'

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
	simple('aux', 'SAÍDA 2', 'aux', { cmd: 'StartStopExternal' }, 'aux')
	return presets
}
