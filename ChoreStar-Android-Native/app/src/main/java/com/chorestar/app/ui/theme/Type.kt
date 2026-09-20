package com.chorestar.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val ChoreStarTypography = Typography().let { base ->
    base.copy(
        headlineLarge = base.headlineLarge.copy(fontWeight = FontWeight.ExtraBold),
        headlineMedium = base.headlineMedium.copy(fontWeight = FontWeight.ExtraBold),
        titleLarge = base.titleLarge.copy(fontWeight = FontWeight.Bold),
        titleMedium = base.titleMedium.copy(fontWeight = FontWeight.SemiBold),
        labelLarge = base.labelLarge.copy(fontWeight = FontWeight.SemiBold, fontSize = 15.sp),
    )
}
