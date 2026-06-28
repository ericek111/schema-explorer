export type UrlValidationResult = { ok: true; url: URL } | { ok: false; error: string };

export class UrlValidator {
  validate(value: string | undefined): UrlValidationResult {
    if (!value) {
      return { ok: false, error: 'Missing url query parameter.' };
    }

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return { ok: false, error: 'URL is malformed.' };
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      return { ok: false, error: 'Only http and https URLs are supported.' };
    }

    return { ok: true, url };
  }
}
