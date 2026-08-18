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
import { CurrentUser } from "../../common/current-user.decorator.js";
import { requireIdempotencyKey } from "../../common/idempotency-key.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";
import type { Actor } from "../identity/identity.types.js";
import { PagesService } from "./pages.service.js";

@Controller("pages")
@UseGuards(AdminApiGuard)
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Get()
  @RequireScopes("page:read")
  list(
    @CurrentUser() actor: Actor,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.pages.list({ page, limit }, actor);
  }

  @Post()
  @RequireScopes("page:write")
  create(
    @CurrentUser() actor: Actor,
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
  ) {
    return this.pages.create(
      body,
      requireIdempotencyKey(idempotencyKey),
      actor,
    );
  }

  @Get(":id")
  @RequireScopes("page:read")
  getById(@CurrentUser() actor: Actor, @Param("id") id: string) {
    return this.pages.getById(id, actor);
  }

  @Put(":id/schema")
  @RequireScopes("page:write")
  saveDraft(
    @CurrentUser() actor: Actor,
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("id") id: string,
  ) {
    return this.pages.saveDraft(
      id,
      body,
      requireIdempotencyKey(idempotencyKey),
      actor,
    );
  }

  @Post(":id/publish")
  @RequireScopes("page:publish")
  publish(
    @CurrentUser() actor: Actor,
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("id") id: string,
  ) {
    return this.pages.publish(
      id,
      isEmptyBody(body) ? undefined : body,
      requireIdempotencyKey(idempotencyKey),
      actor,
    );
  }
}

function isEmptyBody(body: unknown): boolean {
  return !body || (typeof body === "object" && Object.keys(body).length === 0);
}
