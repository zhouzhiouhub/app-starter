import { Injectable } from "@nestjs/common";
import {
  exampleLandingPage,
  pageSchema,
  type PageSchema
} from "@app-starter/schema";

@Injectable()
export class PublishedPageStore {
  private readonly pages = new Map<string, PageSchema>([
    [exampleLandingPage.meta.slug, exampleLandingPage]
  ]);

  get(slug: string): PageSchema | null {
    return this.pages.get(slug) ?? null;
  }

  publish(schema: PageSchema): PageSchema {
    const parsed = pageSchema.parse(schema);
    this.pages.set(parsed.meta.slug, parsed);
    return parsed;
  }
}
