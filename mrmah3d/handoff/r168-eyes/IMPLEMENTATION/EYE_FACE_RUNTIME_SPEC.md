# Eye + Face Runtime Specification

## Core architecture
A MAHBEING eye is:

`preset` + `shape parameters` + `iris/pupil parameters` + `detail layers` + `expression state`.

A preset must not be a dead image when the live character renderer can support parameterization.

## Required runtime parameters

- `width`: horizontal eye scale
- `height`: vertical eye scale
- `openness`: lid separation / blink driver
- `spacing`: distance from face center
- `cant`: rotation / tilt
- `irisScale`: pupil/iris footprint
- `gazeX`, `gazeY`: clamped movement
- `upperLid`, `lowerLid`: expression shaping
- `blink`: 0..1 closure
- `detailIntensity`: optional accent strength

## Expression mapping

Neutral: baseline preset values.
Happy: slightly narrower/open smile-eye tendency; do not force anime arcs.
Focused: mild lid reduction + gaze lock + optional slight cant.
Curious: increased openness + small gaze offset.
Surprised: wider/open, iris may read slightly smaller relative to aperture.
Tired: reduced openness, heavier upper lid.
Playful: asymmetry/wink only when supported.

## Signature defaults

### MR_MAH_SIGNATURE
Friendly-focused, compact pixel/faceted eye aperture, restrained cyan iris/core, no default angry brow language.

### MRS_MAH_SIGNATURE
Kind-confident, slightly softer aperture, optional tasteful lash/detail layer, same renderer/data model.

### MAH_ORIGINAL_SIGNATURE
Evolution of the original circle identity: round/open/friendly and iconic, but with a more authored pixel/faceted aperture and controlled cyan center.

## Compatibility
Legacy circular eyes should map to `MAH_ORIGINAL_SIGNATURE` or a dedicated `legacy_circle` preset during migration, depending existing save compatibility.
