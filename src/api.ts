import { TCPHelper, InstanceStatus } from '@companion-module/base'
import { XMLParser } from 'fast-xml-parser'
import type { StudioInstance } from './main.js'

/** One entry of the input list, as reported in the XML state. */
export interface StudioInput {
	/** Position in the Projetech Studio list, starting at 1 (what actions call "input"). */
	number: number
	key: string
	title: string
	type: string
	/** "Running", "Paused" or "Completed". */
	state: string
	/** Playback position and duration in milliseconds (0 for live inputs). */
	position: number
	duration: number
	loop: boolean
}

/** Everything the module knows about Projetech Studio; feedbacks and variables are computed from this. */
export interface StudioState {
	inputs: StudioInput[]
	/** Input number on air (0 = wait screen) and on preview (0 = none). */
	active: number
	preview: number
	recording: boolean
	streaming: boolean
	/** LED output window on. */
	fullscreen: boolean
	/** Output 2 (multiview / input) on. */
	external: boolean
	fadeToBlack: boolean
	/** vMix tally string: one digit per input in list order, 0 = off, 1 = program, 2 = preview. */
	tally: string
	/** This module's TCP connection to Projetech Studio is up (the failover recipe checks the other computer with it). */
	connected: boolean
	/** Master/slave link of this Projetech Studio with another one (the `<sync>` element of the XML state). */
	sync: SyncState
}

/** Role of this computer on the master/slave link. */
export type SyncRole = 'master' | 'slave' | 'standalone'

export interface SyncState {
	role: SyncRole
	/** "Ready", "Syncing", "WaitingPartner", "DualMaster"… */
	state: string
	/** Linked to the partner right now. */
	linked: boolean
	partner: string
	partnerAddress: string
	/** This computer took over after its master stopped answering or closed. */
	promoted: boolean
	/** The partner is streaming ("Assumir transmissão" is possible here). */
	partnerStreaming: boolean
}

/** State flags driven by activator pushes ("ACTS OK <name> <0|1>") and by the XML state. */
type Flag = 'recording' | 'streaming' | 'fullscreen' | 'external' | 'fadeToBlack'

const ACTIVATOR_FLAGS: Record<string, Flag> = {
	Recording: 'recording',
	Streaming: 'streaming',
	Fullscreen: 'fullscreen',
	External: 'external',
	FadeToBlack: 'fadeToBlack',
}

/** Bigger than any real XML state; protects against a peer that never sends a line break. */
const MAX_BUFFER_BYTES = 8 * 1024 * 1024

/** An XML request that got no answer for this long is considered lost and is sent again. */
const XML_RESPONSE_TIMEOUT_MS = 5000

const emptySync = (): SyncState => ({
	role: 'standalone',
	state: '',
	linked: false,
	partner: '',
	partnerAddress: '',
	promoted: false,
	partnerStreaming: false,
})

const emptyState = (): StudioState => ({
	inputs: [],
	active: 0,
	preview: 0,
	recording: false,
	streaming: false,
	fullscreen: false,
	external: false,
	fadeToBlack: false,
	tally: '',
	connected: false,
	sync: emptySync(),
})

const ROLES: Record<string, SyncRole> = { Master: 'master', Slave: 'slave' }

/**
 * Client for the Projetech Studio TCP API (port 8099), which follows the vMix TCP API:
 *
 * - every command is one line ending in CRLF (`FUNCTION Cut Input=2`, `XML`, `SUBSCRIBE TALLY`…);
 * - simple replies are one line too (`TALLY OK 0120`, `ACTS OK Recording 1`, `FUNCTION ER <message>`);
 * - `XML` is answered with `XML <length>` followed by the XML document, where length counts UTF-8 bytes.
 *
 * Tally and activators (recording, outputs…) are pushed by the server after SUBSCRIBE; the rest of the state
 * (input names, positions, preview/program) comes from polling `XML`.
 */
export class StudioApi {
	private socket: TCPHelper | null = null
	/** Bytes received and not parsed yet. Kept as bytes because the XML length is in bytes and chunks can split characters. */
	private buffer: Buffer = Buffer.alloc(0)
	private pollTimer: NodeJS.Timeout | null = null
	/** Time the unanswered XML request was sent (0 = none pending): only one XML request is in flight at a time. */
	private xmlRequestedAt = 0
	private readonly parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '',
		textNodeName: 'text',
		parseTagValue: false,
		parseAttributeValue: false,
	})

	public state: StudioState = emptyState()

	constructor(private readonly instance: StudioInstance) {}

	/** Opens (or reopens) the connection. TCPHelper reconnects on its own if Projetech Studio closes or restarts. */
	connect(host: string, port: number, pollInterval: number): void {
		this.disconnect()
		this.socket = new TCPHelper(host, port)
		this.socket.on('status_change', (status, message) => {
			this.instance.updateStatus(status, message)
			// Without a connection the last known tally is stale: clear it so buttons do not show an old program/preview.
			if (status !== InstanceStatus.Ok) this.clearState()
		})
		this.socket.on('error', (err) => this.instance.log('error', `TCP: ${err.message}`))
		this.socket.on('connect', () => {
			this.instance.updateStatus(InstanceStatus.Ok)
			this.state.connected = true
			this.afterStateChange(true)
			this.xmlRequestedAt = 0
			this.send('SUBSCRIBE TALLY')
			this.send('SUBSCRIBE ACTS')
			this.requestXml()
		})
		this.socket.on('data', (data) => this.onData(data))
		this.pollTimer = setInterval(() => this.requestXml(), pollInterval)
	}

	disconnect(): void {
		if (this.pollTimer) clearInterval(this.pollTimer)
		this.pollTimer = null
		this.socket?.destroy()
		this.socket = null
		this.buffer = Buffer.alloc(0)
		this.xmlRequestedAt = 0
	}

	/** Sends one command line; does nothing while disconnected (actions pressed offline are dropped, not queued). */
	send(line: string): void {
		if (!this.socket?.isConnected) return
		this.socket.send(line + '\r\n').catch((err: unknown) => {
			this.instance.log('debug', `Falha ao enviar "${line}": ${err instanceof Error ? err.message : String(err)}`)
		})
	}

	/** `FUNCTION <name> Input=1&Value=…` (vMix syntax); undefined or empty parameters are left out. */
	sendFunction(name: string, params: Record<string, string | number | undefined> = {}): void {
		const query = Object.entries(params)
			.filter(([, v]) => v !== undefined && v !== '')
			.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
			.join('&')
		this.send(query ? `FUNCTION ${name} ${query}` : `FUNCTION ${name}`)
	}

	inputByNumber(n: number): StudioInput | undefined {
		return this.state.inputs.find((i) => i.number === n)
	}

	/** Polls the XML state, unless the previous request is still unanswered (a slow peer must not pile up requests). */
	private requestXml(): void {
		if (!this.socket?.isConnected) return
		if (this.xmlRequestedAt !== 0 && Date.now() - this.xmlRequestedAt < XML_RESPONSE_TIMEOUT_MS) return
		this.xmlRequestedAt = Date.now()
		this.send('XML')
	}

	// ------------------------------------------------------------ incoming

	private onData(chunk: Buffer): void {
		this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk])
		if (this.buffer.length > MAX_BUFFER_BYTES) {
			this.instance.log('warn', 'Resposta grande demais do Projetech Studio, descartada')
			this.buffer = Buffer.alloc(0)
			return
		}
		for (;;) {
			const nl = this.buffer.indexOf('\r\n')
			if (nl < 0) return
			const line = this.buffer.subarray(0, nl).toString('utf8')
			if (line.startsWith('XML ')) {
				const length = parseInt(line.slice(4), 10)
				const start = nl + 2
				if (!Number.isFinite(length) || length < 0 || length > MAX_BUFFER_BYTES) {
					this.buffer = this.buffer.subarray(start)
					continue
				}
				if (this.buffer.length < start + length) return // wait for the rest of the document
				const xml = this.buffer.subarray(start, start + length).toString('utf8')
				let rest = this.buffer.subarray(start + length)
				if (rest.length >= 2 && rest[0] === 0x0d && rest[1] === 0x0a) rest = rest.subarray(2)
				this.buffer = rest
				this.xmlRequestedAt = 0
				this.onXml(xml)
				continue
			}
			this.buffer = this.buffer.subarray(nl + 2)
			this.onLine(line)
		}
	}

	private onLine(line: string): void {
		if (line.startsWith('TALLY OK ')) {
			const tally = line.slice(9).trim()
			if (tally !== this.state.tally) {
				this.state.tally = tally
				this.instance.checkFeedbacks('tally')
			}
		} else if (line.startsWith('ACTS OK ')) {
			// Activator pushes, e.g. "ACTS OK Recording 1". Input activators are covered by the tally string.
			const [name, value] = line.slice(8).trim().split(' ')
			const flag = ACTIVATOR_FLAGS[name]
			const on = value === '1'
			if (flag && this.state[flag] !== on) {
				this.state[flag] = on
				this.afterStateChange(true)
			}
		} else if (line.startsWith('FUNCTION ER ')) {
			this.instance.log('warn', line.slice(12))
		}
	}

	private onXml(xml: string): void {
		try {
			const doc = this.parser.parse(xml)?.vmix
			if (!doc) return
			const raw = doc.inputs?.input
			const list: Record<string, string>[] = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw]
			const flagsBefore = this.flagSignature()
			this.state.inputs = list.map((i) => ({
				number: parseInt(i.number, 10),
				key: i.key ?? '',
				title: i.title ?? i.text ?? '',
				type: i.type ?? '',
				state: i.state ?? '',
				position: parseInt(i.position ?? '0', 10) || 0,
				duration: parseInt(i.duration ?? '0', 10) || 0,
				loop: i.loop === 'True',
			}))
			this.state.active = parseInt(String(doc.active ?? '0'), 10) || 0
			this.state.preview = parseInt(String(doc.preview ?? '0'), 10) || 0
			this.state.recording = String(doc.recording) === 'True'
			this.state.streaming = String(doc.streaming) === 'True'
			this.state.fullscreen = String(doc.fullscreen) === 'True'
			this.state.external = String(doc.external) === 'True'
			this.state.fadeToBlack = String(doc.fadeToBlack) === 'True'
			const sync = doc.sync as Record<string, string> | undefined
			this.state.sync = sync
				? {
						role: ROLES[sync.role ?? ''] ?? 'standalone',
						state: sync.state ?? '',
						linked: sync.connected === 'True',
						partner: sync.partner ?? '',
						partnerAddress: sync.partnerAddress ?? '',
						promoted: sync.promoted === 'True',
						partnerStreaming: sync.partnerStreaming === 'True',
					}
				: emptySync()
			this.afterStateChange(this.flagSignature() !== flagsBefore)
		} catch (err) {
			this.instance.log('debug', `XML inválido: ${err instanceof Error ? err.message : String(err)}`)
		}
	}

	private flagSignature(): string {
		const s = this.state
		return [
			s.recording,
			s.streaming,
			s.fullscreen,
			s.external,
			s.fadeToBlack,
			s.connected,
			s.sync.linked,
			s.sync.promoted,
			s.sync.partnerStreaming,
		]
			.map(Number)
			.join('')
			.concat(s.sync.role, s.sync.state)
	}

	/** Variables only send what changed (see StudioInstance.updateVariables); feedbacks are re-checked when a flag changed. */
	private afterStateChange(flagsChanged: boolean): void {
		this.instance.updateVariables()
		if (flagsChanged)
			this.instance.checkFeedbacks('recording', 'streaming', 'output', 'aux', 'fadeToBlack', 'syncRole', 'connected')
	}

	private clearState(): void {
		this.state = emptyState()
		this.instance.updateVariables()
		this.instance.checkFeedbacks()
	}
}
