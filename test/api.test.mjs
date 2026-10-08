// Protocol tests for StudioApi against a local fake of the Projetech Studio TCP API (same replies as the real one).
// Run with `yarn test` (builds first, then uses Node's built-in test runner on dist/).
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import { StudioApi } from '../dist/api.js'

const names = ['Abertura vídeo', 'Apresentação São João', 'Câmera 1 (NDI)']
const xml = [
	'<vmix>',
	'  <version>27.0.0.1</version>',
	'  <inputs>',
	...names.map(
		(n, i) =>
			`    <input key="k${i + 1}" number="${i + 1}" type="Video" title="${n}" state="Paused" position="1000" duration="61000" loop="False">${n}</input>`,
	),
	'  </inputs>',
	'  <preview>2</preview>',
	'  <active>1</active>',
	'  <fadeToBlack>False</fadeToBlack>',
	'  <recording>False</recording>',
	'  <external>False</external>',
	'  <streaming>False</streaming>',
	'  <fullscreen>True</fullscreen>',
	'</vmix>',
].join('\r\n')

/** Fake server: answers like Projetech Studio and writes in 7-byte pieces, splitting multi-byte characters. */
function startServer() {
	const received = []
	const sockets = new Set()
	let recording = false
	const server = net.createServer((sock) => {
		sockets.add(sock)
		sock.on('close', () => sockets.delete(sock))
		const writeChunked = async (text) => {
			const bytes = Buffer.from(text, 'utf8')
			for (let i = 0; i < bytes.length; i += 7) {
				sock.write(bytes.subarray(i, i + 7))
				await new Promise((r) => setTimeout(r, 1))
			}
		}
		sock.write('VERSION OK 27.0.0.1\r\n')
		let pending = ''
		sock.on('data', async (data) => {
			pending += data.toString('utf8')
			let nl
			while ((nl = pending.indexOf('\r\n')) >= 0) {
				const line = pending.slice(0, nl).trim()
				pending = pending.slice(nl + 2)
				received.push(line)
				const [cmd, arg] = line.split(' ')
				if (cmd === 'SUBSCRIBE' && arg === 'TALLY') sock.write('SUBSCRIBE OK TALLY\r\nTALLY OK 120\r\n')
				else if (cmd === 'SUBSCRIBE' && arg === 'ACTS') sock.write('SUBSCRIBE OK ACTS\r\n')
				else if (cmd === 'XML')
					await writeChunked(`XML ${Buffer.byteLength(xml, 'utf8')}\r\n${xml}\r\nTALLY OK 102\r\n`)
				else if (cmd === 'FUNCTION') {
					sock.write(`FUNCTION OK ${arg}\r\n`)
					if (arg === 'StartStopRecording') {
						recording = !recording
						sock.write(`ACTS OK Recording ${recording ? 1 : 0}\r\n`)
					}
				}
			}
		})
	})
	return new Promise((resolve) =>
		server.listen(0, '127.0.0.1', () =>
			resolve({
				port: server.address().port,
				received,
				dropClients: () => sockets.forEach((s) => s.destroy()),
				close: () => new Promise((r) => server.close(r)),
			}),
		),
	)
}

function fakeInstance() {
	const calls = { status: [], feedbacks: 0, variables: 0, logs: [] }
	return {
		calls,
		updateStatus: (status) => calls.status.push(status),
		log: (level, message) => calls.logs.push(`${level}: ${message}`),
		checkFeedbacks: () => calls.feedbacks++,
		updateVariables: () => calls.variables++,
	}
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const server = await startServer()
const instance = fakeInstance()
const api = new StudioApi(instance)
api.connect('127.0.0.1', server.port, 60_000)
await wait(600)

after(async () => {
	api.disconnect()
	await server.close()
})

test('connects and subscribes to tally and activators', () => {
	assert.ok(instance.calls.status.includes('ok'))
	assert.deepEqual(server.received.slice(0, 3), ['SUBSCRIBE TALLY', 'SUBSCRIBE ACTS', 'XML'])
})

test('reads the XML state, counting its length in UTF-8 bytes', () => {
	assert.deepEqual(
		api.state.inputs.map((i) => i.title),
		names,
	)
	assert.equal(api.state.active, 1)
	assert.equal(api.state.preview, 2)
	assert.equal(api.state.fullscreen, true)
	assert.equal(api.inputByNumber(1)?.duration, 61000)
})

test('keeps the line that arrives right after the XML document', () => {
	assert.equal(api.state.tally, '102')
})

test('sends functions with URL-encoded parameters', async () => {
	api.sendFunction('Fade', { Input: 2, Duration: 500, Value: undefined })
	api.sendFunction('SetCountdown', { Value: '00:05:00' })
	await wait(200)
	assert.ok(server.received.includes('FUNCTION Fade Input=2&Duration=500'))
	assert.ok(server.received.includes('FUNCTION SetCountdown Value=00%3A05%3A00'))
})

test('follows activator pushes', async () => {
	api.sendFunction('StartStopRecording')
	await wait(200)
	assert.equal(api.state.recording, true)
})

test('clears the state when the connection drops', async () => {
	server.dropClients()
	await wait(300)
	assert.equal(api.state.tally, '')
	assert.equal(api.state.inputs.length, 0)
	assert.equal(api.state.recording, false)
})
