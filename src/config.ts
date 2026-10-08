import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export interface StudioConfig {
	host: string
	port: number
	pollInterval: number
}

export const getConfigFields = (): SomeCompanionConfigField[] => [
	{
		type: 'static-text',
		id: 'info',
		width: 12,
		label: 'Projetech Studio',
		value:
			'IP do PC do Projetech Studio e a porta da TCP API (Saída / Config → API). Os inputs são numerados na ordem da lista.',
	},
	{ type: 'textinput', id: 'host', label: 'IP do Projetech Studio', width: 8, regex: Regex.IP, default: '127.0.0.1' },
	{ type: 'number', id: 'port', label: 'Porta TCP', width: 4, min: 1, max: 65535, default: 8099 },
	{
		type: 'number',
		id: 'pollInterval',
		label: 'Intervalo de atualização (ms)',
		width: 4,
		min: 100,
		max: 5000,
		default: 500,
	},
]
