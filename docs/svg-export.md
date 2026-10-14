# Native SVG export

`@sequent-md/core/svg` is a Node-only entry point for producing portable images.
It shares the existing sequent parser and symbol normalization. It does not load
a browser, interpret formula text as TeX, or change HTML/HAST preview behavior.
The regular preview entry point does not load the font engine or font files.

```js
import {renderSvg} from '@sequent-md/core/svg';

const {tree, diagnostics, svg, width, height} = await renderSvg(source);
```

On successful export, `svg` is a standalone XML string and `width` and `height`
are finite, positive SVG pixel dimensions. The returned tree preserves raw
formula text. Parser errors return the normal tree and diagnostics with `svg`,
`width`, and `height` set to `null`. Invalid fonts, unsupported glyphs, invalid XML
characters, and invalid export options throw descriptive errors. A missing glyph
error identifies the Unicode code point and text role. No replacement box is
silently emitted. Empty documents produce a small transparent SVG.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `symbols` | Built-in aliases | Add or override aliases, as with HTML and rehype. |
| `title` | Sole rule/family name, or `Sequent proof document` | Accessible image title. |
| `description` | Generated rule and premise/conclusion description | Image description; original source is always appended. |
| `fontSize` | `17` | Finite positive size in SVG pixels. Spacing and bar thickness scale with it. |
| `maxWidth` | `320` | Finite positive target width including image padding. |
| `fonts` | Bundled static fonts | Individual face replacements and ordered fallback fonts supplied as bytes. |

The background is transparent; glyphs and bars use `#111`. Formulae use regular
type, rule labels italic type, and family headings bold type. Family rules and
document declarations stack vertically. Premises preserve source order while
packing into rows, with bottom alignment within each row. Conclusions center
below their inference bars, and labels reserve a separate space beside the bar.

Formula wrapping uses whitespace boundaries. Existing source line breaks and
relative hanging indentation remain explicit; inserted wraps repeat that line's
indentation. Spaces between words retain their advances. Tabs expand at eight
character-column stops. Unicode spaces are retained; nonbreaking spaces and
narrow nonbreaking spaces remain inside unbreakable words. Invisible spaces at inserted line ends do not enlarge
the measured box. Unbreakable tokens, long labels, or very narrow targets can
expand the image beyond `maxWidth`; content is not clipped or automatically
reduced to smaller typography. Generate a wider profile when that is preferable.

## Fonts and determinism

Bundled faces are DejaVu Serif regular, italic, and bold. DejaVu Sans Mono is the
fallback, including the `⊸` glyph missing from the serif faces. Font files and
their notice are unmodified; SHA-256 pins are recorded in `packages/core/fonts/manifest.json`.
The font engine and dependency graph are pinned in the package lockfile.

Supply `Uint8Array` or Node `Buffer` bytes to replace a face:

```js
import {readFile} from 'node:fs/promises';

await renderSvg(source, {
  fonts: {
    regular: await readFile('/absolute/path/to/regular.ttf'),
    italic: await readFile('/absolute/path/to/italic.otf'),
    fallback: [await readFile('/absolute/path/to/symbols.ttf')]
  }
});
```

Omitted faces keep their bundled defaults. An explicit `fallback` array replaces
the bundled fallback list, in the given order; `[]` disables fallback. Static
outline fonts are supported; collections, variable fonts, and glyphs requiring
bitmap/color rendering are not supported by this exporter. RTL shaping
requires an OpenType (GSUB/GPOS) or AAT (morx) layout table for RTL runs;
supplied fonts without one fail explicitly for RTL text. Fallback selection
keeps combining sequences together, then shapes contiguous runs with their
selected face. Runs also split at Unicode script and bidi embedding boundaries,
use explicit shaping direction, and are placed in resolved visual order. This
keeps Arabic joining and LTR digit order intact in mixed-direction text. Visible
wraps retain the resolved bidi context of their original explicit source line.
Supplementary Unicode characters resolve as complete scalar values, with levels
mapped back to source offsets for wrapping and grapheme segmentation.
Visible run bounds and outlines always come from the same shaping operation. Separator
spaces at an inserted wrap remain in canonical/logical text but are trimmed
before both measuring and drawing that visual line.
Export does not consult system fonts or fetch font resources.

The same source, font bytes, options, and pinned runtime produce byte-identical
SVG. Glyph definitions and fragment references have deterministic identifiers.
Exact bytes are not promised across changes to the font engine or typography.

## Accessibility and embedding

SVG contains a title, description, and complete original source. All source text
is escaped. Images contain outlined paths, inference lines, and local glyph
references, with no script, HTML fragments, external resources, or reader font
dependency. Visible glyphs are not selectable text.

When embedding as an external image, provide host alt text as well as the SVG
metadata. For Quarto, provide `fig-alt` explicitly; a figure caption does not
necessarily become image alt text. Preserve a visible or downloadable canonical
source for readers who need the notation as text.

A static image scales as a whole; EPUB text-size settings do not reflow its
outlined glyphs. Use the narrow export profile for narrow readers and retain
accessible source. Verify larger profiles at their actual display size rather
than assuming scaling will preserve readability.

See [format verification](svg-format-verification.md) for the reproducible
external-image test across HTML, EPUB, A5 book PDF, and A4 PDF. Migration of the
Ash adapter remains a separate follow-up after those checks pass.
