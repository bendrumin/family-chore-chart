package com.chorestar.app;

import android.graphics.Color;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.widget.FrameLayout;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Paints the status bar and navigation bar strips in the web app's own colors.
 *
 * Android 15 (API 35) enforces edge-to-edge and turned Window.setStatusBarColor
 * into a no-op, so @capacitor/status-bar's setBackgroundColor does nothing on a
 * modern phone: verified on a Galaxy S25 Ultra, where the strip stayed #FAFAFA
 * above a deep red app header. Capacitor still insets its WebView, so those two
 * strips are empty space in the activity's content frame. This plugin fills
 * that space with two plain views sized from the window insets, which the web
 * layer colors to match whatever is painted next to them (the themed header on
 * top, the shell tab bar at the bottom).
 *
 * Icon contrast is set separately per bar, since the header can be dark while
 * the tab bar is white.
 */
@CapacitorPlugin(name = "SystemBarsTheme")
public class SystemBarsThemePlugin extends Plugin {

    private View topBar;
    private View bottomBar;

    @Override
    public void load() {
        getActivity().runOnUiThread(this::installBars);
    }

    private void installBars() {
        if (topBar != null && bottomBar != null) return;
        FrameLayout content = getActivity().findViewById(android.R.id.content);
        if (content == null) return;

        topBar = new View(getContext());
        bottomBar = new View(getContext());
        content.addView(topBar, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, 0, Gravity.TOP));
        content.addView(bottomBar, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, 0, Gravity.BOTTOM));

        // The insets change with rotation, the gesture/3-button setting, and
        // the IME, so the strips are resized from the live values rather than
        // measured once. The insets are passed through untouched: the WebView
        // below still needs them to inset itself.
        ViewCompat.setOnApplyWindowInsetsListener(content, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            resize(topBar, bars.top);
            resize(bottomBar, bars.bottom);
            return insets;
        });
        ViewCompat.requestApplyInsets(content);
    }

    private void resize(View bar, int height) {
        if (bar == null) return;
        FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) bar.getLayoutParams();
        if (params.height == height) return;
        params.height = height;
        bar.setLayoutParams(params);
    }

    /**
     * statusColor / navColor: any color Color.parseColor accepts (#rrggbb).
     * lightStatusIcons / lightNavIcons: true for white icons on a dark bar.
     */
    @PluginMethod
    public void apply(PluginCall call) {
        final String statusColor = call.getString("statusColor");
        final String navColor = call.getString("navColor");
        final boolean lightStatusIcons = Boolean.TRUE.equals(call.getBoolean("lightStatusIcons", false));
        final boolean lightNavIcons = Boolean.TRUE.equals(call.getBoolean("lightNavIcons", false));

        getActivity().runOnUiThread(() -> {
            try {
                installBars();
                if (topBar != null && statusColor != null) topBar.setBackgroundColor(Color.parseColor(statusColor));
                if (bottomBar != null && navColor != null) bottomBar.setBackgroundColor(Color.parseColor(navColor));

                Window window = getActivity().getWindow();
                WindowInsetsControllerCompat controller =
                    new WindowInsetsControllerCompat(window, window.getDecorView());
                // "Appearance light" means dark icons drawn for a light bar.
                controller.setAppearanceLightStatusBars(!lightStatusIcons);
                controller.setAppearanceLightNavigationBars(!lightNavIcons);
                call.resolve();
            } catch (IllegalArgumentException e) {
                call.reject("Invalid color: " + e.getMessage());
            }
        });
    }
}
