import { InstanceBase, InstanceStatus, runEntrypoint, type SomeCompanionConfigField } from '@companion-module/base'
import { getConfigFields, type StudioConfig } from './config.js'
import { StudioApi } from './api.js'
import { getActions } from './actions.js'
import { getFeedbacks } from './feedbacks.js'
import { getVariableDefinitions, getVariableValues } from './variables.js'
import { getPresets } from './presets.js'

export class StudioInstance extends InstanceBase<StudioConfig> {
	public config: StudioConfig = { host: '127.0.0.1', port: 8099, pollInterval: 500 }
	public readonly api = new StudioApi(this)

	async init(config: StudioConfig): Promise<void> {
		this.config = config
		this.setActionDefinitions(getActions(this))
		this.setFeedbackDefinitions(getFeedbacks(this))
		this.setVariableDefinitions(getVariableDefinitions())
		this.setPresetDefinitions(getPresets())
		this.updateVariables()
		this.reconnect()
	}

	async destroy(): Promise<void> {
		this.api.disconnect()
	}

	async configUpdated(config: StudioConfig): Promise<void> {
		this.config = config
		this.reconnect()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return getConfigFields()
	}

	updateVariables(): void {
		this.setVariableValues(getVariableValues(this))
	}

	private reconnect(): void {
		if (!this.config.host) {
			this.updateStatus(InstanceStatus.BadConfig, 'Informe o IP do Projetech Studio')
			return
		}
		this.updateStatus(InstanceStatus.Connecting)
		this.api.connect(this.config.host, this.config.port || 8099, this.config.pollInterval || 500)
	}
}

runEntrypoint(StudioInstance, [])
