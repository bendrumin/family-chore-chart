package com.chorestar.app.data

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.android.billingclient.api.queryProductDetails
import com.android.billingclient.api.queryPurchasesAsync
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Google Play subscriptions, the Android twin of iOS StoreKitManager. Product ids
 * match chorestar-nextjs/lib/google/play-billing.ts. Every purchase is verified by
 * POST /api/google/verify with the parent's token; the server links the token to
 * the profile, flips the tier (upgrade only, like iOS) and acknowledges it.
 * Cancellations arrive by RTDN on the server; the app never downgrades itself.
 */
class PlayBilling(context: Context, private val verify: suspend (purchaseToken: String, productId: String?) -> Result<String>) {
    companion object {
        const val MONTHLY = "chorestar_premium_monthly"
        const val YEARLY = "chorestar_premium_yearly"
    }

    data class Plan(val productId: String, val details: ProductDetails, val offerToken: String, val price: String, val period: String)

    sealed interface Event {
        data class Purchased(val tier: String) : Event
        data class Failed(val message: String) : Event
        data object Cancelled : Event
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val _plans = MutableStateFlow<List<Plan>?>(null)
    val plans: StateFlow<List<Plan>?> = _plans
    private val _events = MutableStateFlow<Event?>(null)
    val events: StateFlow<Event?> = _events
    fun clearEvent() { _events.value = null }

    private val client: BillingClient = BillingClient.newBuilder(context)
        .setListener { result, purchases ->
            when (result.responseCode) {
                BillingClient.BillingResponseCode.OK -> purchases?.forEach { handle(it) }
                BillingClient.BillingResponseCode.USER_CANCELED -> _events.value = Event.Cancelled
                else -> _events.value = Event.Failed(result.debugMessage.ifBlank { "Purchase failed (${result.responseCode})" })
            }
        }
        .enablePendingPurchases(com.android.billingclient.api.PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
        .build()

    private suspend fun connect(): Boolean = suspendCancellableCoroutine { cont ->
        if (client.isReady) { cont.resume(true); return@suspendCancellableCoroutine }
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) { if (cont.isActive) cont.resume(result.responseCode == BillingClient.BillingResponseCode.OK) }
            override fun onBillingServiceDisconnected() { if (cont.isActive) cont.resume(false) }
        })
    }

    /** Loads the two plans; an empty list means the products are not live in the Play Console yet. */
    fun loadPlans() {
        scope.launch {
            if (!connect()) { _plans.value = emptyList(); return@launch }
            val params = QueryProductDetailsParams.newBuilder().setProductList(
                listOf(MONTHLY, YEARLY).map { QueryProductDetailsParams.Product.newBuilder().setProductId(it).setProductType(BillingClient.ProductType.SUBS).build() },
            ).build()
            val result = runCatching { client.queryProductDetails(params) }.getOrNull()
            val details = result?.productDetailsList.orEmpty()
            _plans.value = details.mapNotNull { d ->
                val offer = d.subscriptionOfferDetails?.firstOrNull() ?: return@mapNotNull null
                val phase = offer.pricingPhases.pricingPhaseList.lastOrNull() ?: return@mapNotNull null
                Plan(d.productId, d, offer.offerToken, phase.formattedPrice, phase.billingPeriod)
            }.sortedBy { if (it.productId == YEARLY) 0 else 1 }
        }
    }

    /** Stamps the purchase with the profile id so the server can prove it belongs to this account. */
    fun purchase(activity: Activity, plan: Plan, profileId: String) {
        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(plan.details).setOfferToken(plan.offerToken).build()))
            .setObfuscatedAccountId(profileId)
            .build()
        val result = client.launchBillingFlow(activity, params)
        if (result.responseCode != BillingClient.BillingResponseCode.OK) _events.value = Event.Failed(result.debugMessage.ifBlank { "Could not open Google Play" })
    }

    /** Re-verifies every active subscription; heals a stale "free" after a reinstall. */
    fun restore() {
        scope.launch {
            if (!connect()) { _events.value = Event.Failed("Google Play is not available"); return@launch }
            val result = runCatching { client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build()) }.getOrNull()
            val active = result?.purchasesList.orEmpty().filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
            if (active.isEmpty()) { _events.value = Event.Failed("No active subscription found for this Google account"); return@launch }
            active.forEach { handle(it) }
        }
    }

    private fun handle(purchase: Purchase) {
        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) return
        scope.launch {
            verify(purchase.purchaseToken, purchase.products.firstOrNull())
                .onSuccess { tier ->
                    // The server acknowledges too; doing it here as well means a lost server call never leads to a refund.
                    if (!purchase.isAcknowledged) runCatching {
                        client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.purchaseToken).build()) { }
                    }
                    _events.value = Event.Purchased(tier)
                }
                .onFailure { e -> _events.value = Event.Failed(e.message ?: "Verification failed") }
        }
    }
}
