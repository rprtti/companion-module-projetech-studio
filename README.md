# companion-module-projetech-studio

[Bitfocus Companion](https://bitfocus.io/companion) module for **Projetech Studio**, the event video switcher and player by Projetech Eventos. It talks to Projetech Studio over its vMix-compatible TCP API (port 8099): cut/fade, preview, playback, overlays, audio, recording, streaming, outputs and timer, with per-input tally.

See [HELP.md](./companion/HELP.md) and [LICENSE](./LICENSE).

The module id was `projetech-pmix` in early test builds (PMix is the product's code name). It is listed in `legacyIds`, so connections made with those builds move to this module.

## Development

Requires Node 22 and Yarn 4 (`corepack enable`).

```
yarn            # install
yarn build      # compile to dist/ (enough for Companion to load it)
yarn dev        # compile in watch mode
yarn lint       # eslint + prettier
yarn package    # build the distributable .tgz
```

To load it while developing: Companion 4.1+ → _Settings → Developer → Developer modules path_ → the folder that contains this one.

## Release

1. Bump `version` in `package.json` (`companion/manifest.json` keeps `0.0.0`, the build fills it in).
2. Tag `vX.Y.Z` (GitHub release or `git tag` + push).
3. Submit the tag at https://developer.bitfocus.io → _My Connections_ → this module → _Submit Version_.

---

## Português

Módulo do Companion para o **Projetech Studio**. Instalação, pela página _Modules_ do Companion 4 ou mais novo: pesquise **Projetech Studio** (depois que a versão for aprovada pela Bitfocus) ou importe o pacote `.tgz` da página de download (https://studio.projetech.com.br). Depois crie a conexão com o IP do PC do Projetech Studio e a porta 8099, e use os botões prontos em _Presets → Projetech Studio_.
