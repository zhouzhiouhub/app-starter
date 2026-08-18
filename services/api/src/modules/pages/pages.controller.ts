import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { requireIdempotencyKey } from "../../common/idempotency-key.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";
import { PagesService } from "./pages.service.js";

@Controller("pages")
@UseGuards(AdminApiGuard)
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Get()
  @RequireScopes("page:read")
  list(@Query("page") page?: string, @Query("limit") limit?: string) {
    return this.pages.list({ page, limit });
  }

  @Post()
  @RequireScopes("page:write")
  create(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
  ) {
    return this.pages.create(body, requireIdempotencyKey(idempotencyKey));
  }

  @Get(":id")
  @RequireScopes("page:read")
  getById(@Param("id") id: string) {
    return this.pages.getById(id);
  }

  @Put(":id/schema")
  @RequireScopes("page:write")
  saveDraft(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("id") id: string,
  ) {
    return this.pages.saveDraft(
      id,
      body,
      requireIdempotencyKey(idempotencyKey),
    );
  }

  @Post(":id/publish")
  @RequireScopes("page:publish")
  publish(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("id") id: string,
  ) {
    return this.pages.publish(
      id,
      isEmptyBody(body) ? undefined : body,
      requireIdempotencyKey(idempotencyKey),
    );
  }
}

function isEmptyBody(body: unknown): boolean {
  return !body || (typeof body === "object" && Object.keys(body).length === 0);
}
