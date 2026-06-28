import type { Context } from 'hono';
import { FetchErrorMapper } from './FetchErrorMapper.js';
import { HtmlFetchService } from './HtmlFetchService.js';
import { UrlValidator } from './UrlValidator.js';

export class FetchController {
  constructor(
    private readonly fetchService: HtmlFetchService,
    private readonly urlValidator = new UrlValidator(),
    private readonly errors = new FetchErrorMapper()
  ) {}

  async handle(c: Context) {
    const validation = this.urlValidator.validate(c.req.query('url'));
    if (!validation.ok) {
      return c.json({ error: validation.error }, 400);
    }

    try {
      const result = await this.fetchService.fetch(validation.url);
      return c.json(result, result.status >= 400 ? 502 : 200);
    } catch (error) {
      return c.json({ error: this.errors.toMessage(error) }, this.errors.toStatus(error));
    }
  }
}
