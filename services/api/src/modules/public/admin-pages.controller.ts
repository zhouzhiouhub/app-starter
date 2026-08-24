import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { requireIdempotencyKey } from "../../common/idempotency-key.js";
import { CurrentRequestId } from "../../common/request-id.decorator.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";
import type { Actor } from "../identity/identity.types.js";
import { PagesService } from "../pages/pages.service.js";

@Controller("admin/pages")
@UseGuards(AdminApiGuard)
export class AdminPagesController {
  constructor(private readonly pages: PagesService) {}

  @Post(":slug/publish")
  @RequireScopes("page:publish")
  publishPage(
    @CurrentUser() actor: Actor,
    @CurrentRequestId() requestId: string,
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("slug") slug: string,
  ) {
    return this.pages.publishBySlug(
      slug,
      body,
      requireIdempotencyKey(idempotencyKey),
      actor,
      requestId,
    );
  }
}
