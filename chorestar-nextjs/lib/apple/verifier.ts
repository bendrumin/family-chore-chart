import {
  Environment,
  SignedDataVerifier,
  VerificationException,
} from '@apple/app-store-server-library'
import type {
  JWSTransactionDecodedPayload,
  ResponseBodyV2DecodedPayload,
} from '@apple/app-store-server-library'
import { APPLE_ROOT_CA_BASE64 } from './root-certs'

export const APPLE_BUNDLE_ID = 'com.chorestar.ChoreStar'
export const APPLE_APP_ID = 6761279049
export const APPLE_SUBSCRIPTION_PRODUCT_IDS = [
  'com.chorestar.premium.monthly',
  'com.chorestar.premium.yearly',
]

const rootCerts = APPLE_ROOT_CA_BASE64.map((b64) => Buffer.from(b64, 'base64'))

function makeVerifier(environment: Environment) {
  // Online checks (OCSP) confirm none of the chain certs were revoked.
  return new SignedDataVerifier(rootCerts, true, environment, APPLE_BUNDLE_ID, APPLE_APP_ID)
}

export interface VerifiedNotification {
  environment: 'Production' | 'Sandbox'
  payload: ResponseBodyV2DecodedPayload
  transaction: JWSTransactionDecodedPayload | null
}

/**
 * Verifies a signed App Store Server Notification V2 payload against Apple's
 * root CAs and this app's bundle id. Tries Production first, then Sandbox, so
 * one endpoint can serve both ASC notification URLs. Throws on anything that
 * fails both — the caller should return a non-2xx so Apple retries.
 */
export async function verifyNotification(signedPayload: string): Promise<VerifiedNotification> {
  let payload: ResponseBodyV2DecodedPayload
  let environment: 'Production' | 'Sandbox'

  try {
    payload = await makeVerifier(Environment.PRODUCTION).verifyAndDecodeNotification(signedPayload)
    environment = 'Production'
  } catch (err) {
    if (!(err instanceof VerificationException)) throw err
    payload = await makeVerifier(Environment.SANDBOX).verifyAndDecodeNotification(signedPayload)
    environment = 'Sandbox'
  }

  let transaction: JWSTransactionDecodedPayload | null = null
  const signedTransactionInfo = payload.data?.signedTransactionInfo
  if (signedTransactionInfo) {
    const env = environment === 'Production' ? Environment.PRODUCTION : Environment.SANDBOX
    transaction = await makeVerifier(env).verifyAndDecodeTransaction(signedTransactionInfo)
  }

  return { environment, payload, transaction }
}
