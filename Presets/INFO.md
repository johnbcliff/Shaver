# INFO #

Presets not included in the application download might be found here.

## Candidates for the next factory bank ##

`candidates.json` is the source. It uses the same format as the plugin's `factory-presets.json`
(only the values that differ from the defaults), so a picked preset can be copied across as is.
The `.shaverpreset` files are built from it:

    node tools/build-presets.mjs             check every value, write the .shaverpreset files here
    node tools/build-presets.mjs --install   also copy them to Documents\Dick The Butcher Effects\Shaver\Presets

To use one by hand, copy its `.shaverpreset` file into that Documents folder. Shaver lists it the
next time you open the preset menu.

Drum Mouth and Static Breather are built for the sidechain: load a drum loop in the SIDECHAIN panel.
