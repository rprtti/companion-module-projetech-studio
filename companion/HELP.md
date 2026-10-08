## Projetech Studio

Controls **Projetech Studio**, the event video switcher and player by Projetech Eventos, over its vMix-compatible TCP API (port 8099 by default). Projetech Studio: https://studio.projetech.com.br

The module's labels are in Portuguese (Brazil), the language of Projetech Studio. English summary below, full help in Portuguese after it.

### Setup

1. In Projetech Studio, the API is on by default: _Saída / Config → API (compatível com vMix)_, TCP port 8099.
2. Add a **Projetech Studio** connection and fill in **IP do Projetech Studio** (the PC running it, `127.0.0.1` on the same PC) and **Porta TCP** (8099).
3. Drag buttons from _Presets → Projetech Studio_: one button per input (1–16) with tally (green on preview, red on air), plus CUT, FADE, STOP, FTB, REC, STREAM, LED output and Output 2.

### Actions

Cut, Fade (optional duration), Preview input, Take (input straight to air), Stop (back to the wait screen), Fade to black, Play / Pause / Play-Pause / Restart, input loop, overlays, input audio to program, input and master volume, recording, streaming, LED output, Output 2, timer (start / pause / reset / set) and a free API function.

Inputs are numbered in the order of the Projetech Studio list (1, 2, 3…). Where an action asks for an input, 0 means "whatever is on preview".

### Feedbacks and variables

- Feedbacks: input tally (program or preview), recording, streaming, LED output on, Output 2 on, fade to black.
- Variables: `active_number`, `active_name`, `preview_number`, `preview_name`, `program_remaining`, `recording`, `streaming`, `input_N_name`.

---

## Português

Controla o **Projetech Studio** pela TCP API (compatível com vMix), porta 8099 por padrão.

### Configuração

- **IP do Projetech Studio**: IP do PC onde o Projetech Studio está aberto (`127.0.0.1` no mesmo PC).
- **Porta TCP**: a porta configurada em _Saída / Config → API_ (padrão 8099).
- **Intervalo de atualização**: com que frequência o estado (XML) é lido para variáveis e feedbacks (padrão 500 ms). O tally chega por push, independente disso.

### Ações

Cut, Fade (com duração), Preview Input, Take (Active Input), Stop (tela de espera), Play / Pause / Play-Pause / Restart, Loop, Overlay (liga/desliga/alternar), Áudio para o PGM, Volume do input, Volume master, Gravação, Streaming, Saída LED, Saída 2, Timer (iniciar / pausar / zerar / definir), Fade to Black e Função livre da API.

Os inputs são numerados na ordem da lista do Projetech Studio (1, 2, 3…). Onde a ação pede um input, 0 significa "o que estiver no preview".

### Feedbacks

- **Tally do input**: vermelho no ar, verde no preview (o botão muda de cor).
- **Gravando**, **Transmitindo**, **Saída LED ligada**, **Saída 2 ligada**, **Fade to black**.

### Variáveis

`active_number`, `active_name`, `preview_number`, `preview_name`, `program_remaining`, `recording`, `streaming`, `input_N_name`.

### Presets

Um botão por input (1–16) com tally, mais CUT, FADE, STOP, FTB, REC, STREAM, Saída LED e Saída 2.
