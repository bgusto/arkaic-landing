# snap.py URL W H OUT [SELECTOR] [SCALE]: renders a page offscreen with WebKit and writes a PNG,
# scrolled so the element matching SELECTOR sits near the top (optional)
import sys, objc
from Foundation import NSURL, NSURLRequest, NSObject, NSMakeRect
from AppKit import NSApplication, NSWindow, NSBitmapImageRep, NSPNGFileType, NSWindowStyleMaskBorderless, NSBackingStoreBuffered
from WebKit import WKWebView, WKWebViewConfiguration, WKSnapshotConfiguration
from PyObjCTools import AppHelper

url, W, H, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
sel = sys.argv[5] if len(sys.argv) > 5 else ""
scale = float(sys.argv[6]) if len(sys.argv) > 6 else 2.0

class Delegate(NSObject):
    def webView_didFinishNavigation_(self, view, nav):
        def snap(res, err):
            open("snap.log","a").write("scrollY %r\n" % (res,))
            cfg = WKSnapshotConfiguration.alloc().init()
            cfg.setSnapshotWidth_(W * scale)
            def done(img, err):
                if img is None:
                    print("snapshot failed", err)
                else:
                    rep = NSBitmapImageRep.imageRepWithData_(img.TIFFRepresentation())
                    rep.representationUsingType_properties_(NSPNGFileType, None).writeToFile_atomically_(out, True)
                    print("wrote", out)
                AppHelper.stopEventLoop()
            view.takeSnapshotWithConfiguration_completionHandler_(cfg, done)
        def check():
            view.evaluateJavaScript_completionHandler_("window.scrollY", snap)
        def scrolled(res, err):
            AppHelper.callLater(1.0, check)
        js = ("(() => { const e = document.querySelector('%s'); const r = e.getBoundingClientRect(); window.scrollTo(0, r.top + window.scrollY - 110); return r.top })()" % sel) if sel else "0"
        AppHelper.callLater(1.5, lambda: view.evaluateJavaScript_completionHandler_(js, scrolled))

app = NSApplication.sharedApplication()
view = WKWebView.alloc().initWithFrame_configuration_(NSMakeRect(0, 0, W, H), WKWebViewConfiguration.alloc().init())
win = NSWindow.alloc().initWithContentRect_styleMask_backing_defer_(NSMakeRect(0, 0, W, H), NSWindowStyleMaskBorderless, NSBackingStoreBuffered, False)
win.setContentView_(view)
delegate = Delegate.alloc().init()
view.setNavigationDelegate_(delegate)
view.loadRequest_(NSURLRequest.requestWithURL_(NSURL.URLWithString_(url)))
AppHelper.runEventLoop()
