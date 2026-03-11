import { Transform, Type } from "class-transformer";
import {
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from "class-validator";

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class WebDavConfigDto {
  @Transform(trimString)
  @IsString({ message: "config.url must be a string" })
  @IsNotEmpty({ message: "config.url cannot be empty" })
  url!: string;

  @Transform(trimString)
  @IsString({ message: "config.username must be a string" })
  @IsNotEmpty({ message: "config.username cannot be empty" })
  username!: string;

  @IsString({ message: "config.password must be a string" })
  @IsNotEmpty({ message: "config.password cannot be empty" })
  password!: string;

  @Transform(trimString)
  @IsOptional()
  @IsString({ message: "config.basePath must be a string" })
  basePath?: string;
}

export class WebDavConfigRequestDto {
  // Reuse nested DTO validation for WebDAV config payload.
  @IsDefined({ message: "config is required" })
  @ValidateNested()
  @Type(() => WebDavConfigDto)
  config!: WebDavConfigDto;
}

export class WebDavPushBodyDto extends WebDavConfigRequestDto {
  @IsObject({ message: "envelope must be an object" })
  envelope!: Record<string, unknown>;

  @Type(() => Number)
  @IsInt({ message: "revision must be an integer" })
  @Min(0, { message: "revision must be >= 0" })
  revision!: number;

  @IsString({ message: "contentHash must be a string" })
  @IsNotEmpty({ message: "contentHash cannot be empty" })
  contentHash!: string;
}
