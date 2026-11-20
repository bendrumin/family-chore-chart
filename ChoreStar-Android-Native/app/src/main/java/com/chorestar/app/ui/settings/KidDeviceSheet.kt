package com.chorestar.app.ui.settings

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chorestar.app.R
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import java.net.URLEncoder

/** The link a kid's device opens: kid login with the family code filled in (web /kid-login/[code]). */
fun kidLoginUrl(familyCode: String): String = "https://chorestar.app/kid-login/" + URLEncoder.encode(familyCode, "UTF-8").replace("+", "%20")

/** A crisp QR code, one pixel per module; Compose scales it up without smoothing. */
fun qrBitmap(text: String): Bitmap? = runCatching {
    val matrix = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, 0, 0, mapOf(EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.M, EncodeHintType.MARGIN to 1))
    val bmp = Bitmap.createBitmap(matrix.width, matrix.height, Bitmap.Config.ARGB_8888)
    for (x in 0 until matrix.width) for (y in 0 until matrix.height) bmp.setPixel(x, y, if (matrix[x, y]) 0xFF111827.toInt() else 0xFFFFFFFF.toInt())
    bmp
}.getOrNull()

/**
 * Getting a kid onto their own tablet or old phone (web KidDeviceModal, iOS
 * KidDeviceView): three steps, a QR code that opens kid login with the family
 * code filled in, the code itself, and the link to send.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KidDeviceSheet(familyCode: String, onDismiss: () -> Unit) {
    val context = LocalContext.current
    val url = kidLoginUrl(familyCode)
    val qr = remember(url) { qrBitmap(url) }
    val kid = stringResource(R.string.kidqr_your_kid)
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = androidx.compose.material3.rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(stringResource(R.string.kidqr_title_any), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(stringResource(R.string.kidqr_step1_any))
                Text(stringResource(R.string.kidqr_step2_named, kid))
                Text(stringResource(R.string.kidqr_step3))
            }
            // Dark modules on white whatever the theme: phone cameras need the contrast.
            qr?.let {
                Image(
                    it.asImageBitmap(), contentDescription = stringResource(R.string.kidqr_image_any), filterQuality = FilterQuality.None,
                    modifier = Modifier.align(Alignment.CenterHorizontally).size(232.dp).clip(RoundedCornerShape(16.dp)).background(Color.White).padding(12.dp),
                )
            }
            Column(Modifier.align(Alignment.CenterHorizontally), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(stringResource(R.string.kidqr_family_code), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(familyCode.uppercase(), style = MaterialTheme.typography.displaySmall, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Black)
                Text(url, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Button(onClick = { share(context, url) }, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(stringResource(R.string.kidqr_send_link)) }
        }
    }
}
