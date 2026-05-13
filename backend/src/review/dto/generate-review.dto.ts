import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class GenerateReviewDto {
  @IsString()
  @MinLength(1, { message: "店铺名称不能为空" })
  @MaxLength(50, { message: "店铺名称不能超过 50 个字符" })
  shopName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: "店铺类型不能超过 30 个字符" })
  shopType?: string;
}
