export function encodeMediaObjectKey(objectKey: string): string {
  return objectKey.split("/").map(encodeMediaPathSegment).join("/");
}

export function encodeMediaPathSegment(value: string): string {
  return encodeURIComponent(value).replace(
    /[!*'()]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}
