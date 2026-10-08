import { TCPHelper, InstanceStatus } from '@companion-module/base'
import { XMLParser } from 'fast-xml-parser'
import type { StudioInstance } from './main.js'

export interface StudioInput {
	number: number
	key: string
	title: string
	type: string
	state: string
	position: number
	duration: number
	loop: boolean
}

export interface StudioState {
	inputs: StudioInput[]
	active: number
	preview: number
	recording: boolean
	streaming: boolean
	fullscreen: boolean
	external: boolean
	fadeToBlack: boolean
	tally: string
}

/**
 * TCP client for the Projetech Studio TCP API (vMix-compatible): keeps the connection alive, subscribes to TALLY and ACTS pushes and
 * polls XML for the rest of the state.
 */
export class StudioApi {
	private socket: TCPHelper | null = null
	/** Raw bytes received and not parsed yet (the XML length in the protocol counts UTF-8 bytes, not characters). */
	private buffer: Buffer = Buffer.alloc(0)
	private pollTimer: NodeJS.Timeout | null = null
	private readonly parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', textNodeName: 'text' })

	public state: StudioState = {
		inputs: [],
		active: 0,
		preview: 0,
		recording: false,
		streaming: false,
		fullscreen: false,
		external: false,
		fadeToBlack: false,
		tally: '',
	}

	constructor(private readonly instance: StudioInstance) {}

	connect(host: string, port: number, pollInterval: number): void {
		this.disconnect()
		this.socket = new TCPHelper(host, port)
		this.socket.on('status_change', (status, message) => this.instance.updateStatus(status, message))
		this.socket.on('error', (err) => this.instance.log('error', `TCP: ${err.message}`))
		this.socket.on('connect', () => {
			this.instance.updateStatus(InstanceStatus.Ok)
			this.send('SUBSCRIBE TALLY')
			this.send('SUBSCRIBE ACTS')
			this.send('XML')
		})
		this.socket.on('data', (data) => this.onData(data))
		this.pollTimer = setInterval(() => {
			if (this.socket?.isConnected) this.send('XML')
		}, pollInterval)
	}

	disconnect(): void {
		if (this.pollTimer) clearInterval(this.pollTimer)
		this.pollTimer = null
		this.socket?.destroy()
		this.socket = null
		this.buffer = Buffer.alloc(0)
	}

	send(line: string): void {
		if (!this.socket?.isConnected) return
		void this.socket.send(line + '\r\n')
	}

	/** FUNCTION name Input=1&Value=... (vMix syntax). */
	sendFunction(name: string, params: Record<string, string | number | undefined> = {}): void {
		const query = Object.entries(params)
			.filter(([, v]) => v !== undefined && v !== '')
			.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
			.join('&')
		this.send(query ? `FUNCTION ${name} ${query}` : `FUNCTION ${name}`)
	}

	// ------------------------------------------------------------ incoming

	private onData(chunk: Buffer): void {
		// Work on bytes: a chunk can end in the middle of a multi-byte character, and the XML length is in bytes.
		this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk])
		for (;;) {
			const nl = this.buffer.indexOf('\r\n')
			if (nl < 0) return
			const line = this.buffer.subarray(0, nl).toString('utf8')
			if (line.startsWith('XML ')) {
				// "XML <length>\r\n<data>\r\n", length = UTF-8 bytes of <data> (input names with accents are longer in bytes).
				const length = parseInt(line.slice(4), 10)
				const start = nl + 2
				if (!Number.isFinite(length) || length < 0) {
					this.buffer = this.buffer.subarray(start)
					continue
				}
				if (this.buffer.length < start + length) return
				const xml = this.buffer.subarray(start, start + length).toString('utf8')
				let rest = this.buffer.subarray(start + length)
				if (rest.length >= 2 && rest[0] === 0x0d && rest[1] === 0x0a) rest = rest.subarray(2)
				this.buffer = rest
				this.onXml(xml)
				continue
			}
			this.buffer = this.buffer.subarray(nl + 2)
			this.onLine(line)
		}
	}

	private onLine(line: string): void {
		if (line.startsWith('TALLY OK ')) {
			this.state.tally = line.slice(9).trim()
			this.instance.checkFeedbacks('tally')
		} else if (line.startsWith('ACTS OK ')) {
			// e.g. "ACTS OK Recording 1" / "ACTS OK Input 2 1": refresh the state on the next poll; tally covers inputs already.
			const parts = line.slice(8).trim().split(' ')
			if (parts[0] === 'Recording') {
				this.state.recording = parts[1] === '1'
				this.afterStateChange()
			} else if (parts[0] === 'Streaming') {
				this.state.streaming = parts[1] === '1'
				this.afterStateChange()
			} else if (parts[0] === 'Fullscreen') {
				this.state.fullscreen = parts[1] === '1'
				this.afterStateChange()
			} else if (parts[0] === 'External') {
				this.state.external = parts[1] === '1'
				this.afterStateChange()
			} else if (parts[0] === 'FadeToBlack') {
				this.state.fadeToBlack = parts[1] === '1'
				this.afterStateChange()
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
			const list = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw]
			this.state.inputs = list.map((i: Record<string, string>) => ({
				number: parseInt(i.number, 10),
				key: i.key ?? '',
				title: i.title ?? i.text ?? '',
				type: i.type ?? '',
				state: i.state ?? '',
				position: parseInt(i.position ?? '0', 10),
				duration: parseInt(i.duration ?? '0', 10),
				loop: i.loop === 'True',
			}))
			this.state.active = parseInt(String(doc.active ?? '0'), 10)
			this.state.preview = parseInt(String(doc.preview ?? '0'), 10)
			this.state.recording = String(doc.recording) === 'True'
			this.state.streaming = String(doc.streaming) === 'True'
			this.state.fullscreen = String(doc.fullscreen) === 'True'
			this.state.external = String(doc.external) === 'True'
			this.state.fadeToBlack = String(doc.fadeToBlack) === 'True'
			this.afterStateChange()
		} catch (err) {
			this.instance.log('debug', `XML inválido: ${(err as Error).message}`)
		}
	}

	private afterStateChange(): void {
		this.instance.updateVariables()
		this.instance.checkFeedbacks()
	}

	inputByNumber(n: number): StudioInput | undefined {
		return this.state.inputs.find((i) => i.number === n)
	}
}
