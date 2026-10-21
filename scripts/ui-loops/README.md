# UI loops

The short looping GIFs of Evolve's UI on the site. They are built, not
screen-shared: `model.html` is the model page written with the UI's own
stylesheet and markup and example data, `terminal.html` is the CLI, and
`compose.py` turns rendered frames into a GIF with a drawn cursor.

`render.sh` does the whole thing. It renders frames offscreen with WebKit
through `snap.py`, which needs PyObjC for the system Python 3.9:

    pip download --only-binary=:all: pyobjc-core==10.3.1 \
        pyobjc-framework-Cocoa==10.3.1 pyobjc-framework-WebKit==10.3.1 -d /tmp/w
    for f in /tmp/w/*.whl; do unzip -oq "$f" -d pylib; done
    PYTHONPATH=pylib ./render.sh

It copies the stylesheet from `~/Projects/evolve/clients/ui` (or `$EVOLVE_UI`),
so the mock keeps up with the product's look. The fonts come from Google Fonts
at render time.

For another loop in the series: copy `model.html` for the page, change the
cursor's path and the button in `compose.py`, and add a `render.sh` line.
