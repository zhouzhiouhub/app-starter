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
  ) {
    return this.media.list({ page, limit, status, type }, actor);
  }

  @Post("upload-url")
  @RequireScopes("media:write")
  createUploadUrl(@CurrentUser() actor: Actor, @Body() body: unknown) {
    return this.media.createUploadUrl(body, actor);
  }

  @Post("confirm")
  @RequireScopes("media:write")
  confirm(
    @CurrentUser() actor: Actor,
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
  ) {
    return this.media.confirm(
      body,
      requireIdempotencyKey(idempotencyKey),
      actor,
    );
  }

  @Post(":id/archive")
  @RequireScopes("media:write")
  archive(@CurrentUser() actor: Actor, @Param("id") id: string) {
    return this.media.archive(id, actor);
  }
}
