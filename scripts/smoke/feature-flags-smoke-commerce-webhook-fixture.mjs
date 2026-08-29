export function createCommerceWebhookVerificationFixture(init = {}) {
  const body = typeof init.body === "string" ? init.body : "";
  const signature = readHeader(init.headers, "Stripe-Signature").trim();
  const signatureTimestampReady = hasNumericSignaturePart(signature, "t");
  const signatureV1Ready = hasNonEmptySignaturePart(signature, "v1");
  const rawBodyCaptured = body.length > 0;

  return {
    eventProcessed: false,
    rawBodyBytes: Buffer.byteLength(body),
    rawBodyCaptured,
    readyForSignatureVerification:
      rawBodyCaptured && signatureTimestampReady && signatureV1Ready,
    signatureHasTimestamp: hasSignaturePart(signature, "t"),
    signatureHasV1: hasSignaturePart(signature, "v1"),
    signatureProvided: signature.length > 0,
    signatureTimestampReady,
    signatureV1Ready,
    signatureVerified: false,
    webhookEventPersisted: false,
  };
}

function readHeader(headers, name) {
  if (!headers || typeof headers !== "object") {
    return "";
  }

  const pair = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );

  return typeof pair?.[1] === "string" ? pair[1] : "";
}

function hasSignaturePart(signature, key) {
  return readSignaturePartValues(signature, key).length > 0;
}

function hasNonEmptySignaturePart(signature, key) {
  return readSignaturePartValues(signature, key).some(
    (value) => value.length > 0,
  );
}

function hasNumericSignaturePart(signature, key) {
  return readSignaturePartValues(signature, key).some((value) =>
    /^\d+$/.test(value),
  );
}

function readSignaturePartValues(signature, key) {
  return signature
    .split(",")
    .map((part) => part.trim())
    .flatMap((part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex <= 0) {
        return [];
      }

      const partKey = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();

      return partKey === key ? [value] : [];
    });
}
