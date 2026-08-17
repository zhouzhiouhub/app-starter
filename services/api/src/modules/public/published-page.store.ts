import { Injectable } from "@nestjs/common";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  exampleLandingPage,
  pageSchema,
  type PageSchema
} from "@app-starter/schema";

@Injectable()
export class PublishedPageStore {
  private readonly filePath =
    process.env.PUBLISHED_PAGE_STORE_PATH ??
    join(process.cwd(), ".data", "published-pages.json");

  private readonly pages = new Map<string, PageSchema>();

  constructor() {
    this.load();
    this.pages.set(
      exampleLandingPage.meta.slug,
      this.pages.get(exampleLandingPage.meta.slug) ?? exampleLandingPage
    );
  }

  get(slug: string): PageSchema | null {
    return this.pages.get(slug) ?? null;
  }

  publish(schema: PageSchema): PageSchema {
    const parsed = pageSchema.parse(schema);
    this.pages.set(parsed.meta.slug, parsed);
    this.save();
    return parsed;
  }

  private load() {
    if (!existsSync(this.filePath)) {
      return;
    }

    const raw = JSON.parse(readFileSync(this.filePath, "utf8")) as unknown;

    if (!raw || typeof raw !== "object") {
      return;
    }

    for (const [slug, value] of Object.entries(raw)) {
      const parsed = pageSchema.safeParse(value);

      if (parsed.success) {
        this.pages.set(slug, parsed.data);
      }
    }
  }

  private save() {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(
      this.filePath,
      JSON.stringify(Object.fromEntries(this.pages), null, 2)
    );
  }
}
