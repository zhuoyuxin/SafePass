import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsObject, IsString, Min } from "class-validator";

export class SaveVaultBodyDto {
  // Envelope shape is validated in detail by the service layer.
  @IsObject({ message: "envelope must be an object" })
  envelope!: Record<string, unknown>;

  @Type(() => Number)
  @IsInt({ message: "expectedRevision must be an integer" })
  @Min(0, { message: "expectedRevision must be >= 0" })
  expectedRevision!: number;

  @IsString({ message: "contentHash must be a string" })
  @IsNotEmpty({ message: "contentHash cannot be empty" })
  contentHash!: string;
}
