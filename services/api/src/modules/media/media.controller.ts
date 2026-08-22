import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { requireIdempotencyKey } from "../../common/idempotency-key.js";
import { CurrentRequestId } from "../../common/request-id.decorator.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";
import type { Actor } from "../identity/identity.types.js";
import { MediaService } from "./media.service.js";

@Controller("media")
@UseGuards(AdminApiGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  @RequireScopes("media:read")
  list(
    @CurrentUser() actor: Actor,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("type") type?: string,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    return this.media.list({ page, limit, status, type }, actor, requestId);
  }

  @Post("upload-url")
  @RequireScopes("media:write")
  createUploadUrl(
    @CurrentUser() actor: Actor,
    @CurrentRequestId() requestId: string,
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
  ) {
    return this.media.createUploadUrl(
      body,
      requireIdempotencyKey(idempotencyKey),
      actor,
      requestId,
    );
  }

  @Post("confirm")
  @RequireScopes("media:write")
  confirm(
    @CurrentUser() actor: Actor,
    @CurrentRequestId() requestId: string,
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
  ) {
    return this.media.confirm(
      body,
      requireIdempotencyKey(idempotencyKey),
      actor,
      requestId,
    );
  }

  @Post(":id/archive")
  @RequireScopes("media:write")
  archive(
    @CurrentUser() actor: Actor,
    @CurrentRequestId() requestId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("id") id: string,
  ) {
    return this.media.archive(
      id,
      actor,
      requireIdempotencyKey(idempotencyKey),
      requestId,
    );
  }
}
