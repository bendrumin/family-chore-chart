package com.chorestar.app;

import android.content.pm.ApplicationInfo;
import android.os.Build;
import android.os.Bundle;
import android.view.View;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins register before the bridge starts, or the web layer
        // cannot see them.
        registerPlugin(SystemBarsThemePlugin.class);

        super.onCreate(savedInstanceState);

        // Android's autofill overlay fights the IME inside a WebView: the
        // keyboard opens for password fields but never for username/email
        // fields (the overlay claims the focus event and the IME stays
        // hidden). Opting the WebView subtree out of autofill restores the
        // keyboard everywhere. Tradeoff: password managers cannot fill
        // inside the app; "Remember me" plus long sessions cover returning
        // users.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getBridge().getWebView()
                .setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        }

        // EMULATOR ONLY: the Android emulator's GPU translation corrupts the
        // WebView's hardware-composited tiles when a dialog stacks over the
        // page (ghost card halves, clipped borders, background bleed-through).
        // DevTools captures of the same frame are pixel-perfect, and both
        // host-GPU and SwiftShader modes corrupt identically, so it is the
        // emulator's compositing path, not the page. A software layer bypasses
        // it there.
        //
        // It must not reach real hardware. A debug build on a Galaxy S25 Ultra
        // scrolled at 17fps with 99% janky frames and the GPU idle at 2ms,
        // because every WebView pixel was being drawn on the CPU. Release
        // builds were always fine; this keeps debug builds on a phone honest
        // as well, so what we test is what ships.
        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (debuggable && isEmulator()) {
            getBridge().getWebView().setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        }
    }

    private static boolean isEmulator() {
        return Build.FINGERPRINT.startsWith("generic")
            || Build.FINGERPRINT.startsWith("unknown")
            || Build.FINGERPRINT.contains("emulator")
            || Build.MODEL.contains("Emulator")
            || Build.MODEL.contains("Android SDK built for")
            || Build.MANUFACTURER.contains("Genymotion")
            || Build.PRODUCT.contains("sdk_gphone")
            || Build.PRODUCT.startsWith("sdk")
            || "goldfish".equals(Build.HARDWARE)
            || "ranchu".equals(Build.HARDWARE);
    }
}
