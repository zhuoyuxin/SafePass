import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class LoginBodyDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: "username 不能为空" })
  username!: string;

  @IsString()
  @IsNotEmpty({ message: "password 不能为空" })
  password!: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}

export class RefreshBodyDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: "refreshToken 不能为空" })
  refreshToken!: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}

export class ChangePasswordBodyDto {
  @IsString()
  @IsNotEmpty({ message: "oldPassword 不能为空" })
  oldPassword!: string;

  @IsString()
  @IsNotEmpty({ message: "newPassword 不能为空" })
  newPassword!: string;
}