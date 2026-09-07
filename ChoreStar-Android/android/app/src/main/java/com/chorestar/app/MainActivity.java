package com.chorestar.app;

import android.os.Build;
import android.os.Bundle;
import android.view.View;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
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
    }
}
