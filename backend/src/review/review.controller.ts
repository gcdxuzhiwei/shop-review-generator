import { Body, Controller, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { GenerateReviewDto } from "./dto/generate-review.dto";
import { ReviewService } from "./review.service";

@Controller("review")
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post("generate")
  async generate(@Body() dto: GenerateReviewDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    return this.reviewService.generate(dto, ip);
  }
}
