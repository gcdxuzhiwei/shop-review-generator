import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError } from "axios";
import { GenerateReviewDto } from "./dto/generate-review.dto";
import { buildSystemPrompt } from "./prompt";

interface DeepSeekChatResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(private readonly config: ConfigService) {}

  async generate(dto: GenerateReviewDto): Promise<{ review: string }> {
    const apiKey = this.config.get<string>("DEEPSEEK_API_KEY");
    const baseUrl = "https://api.deepseek.com/v1";
    const model = "deepseek-v4-flash";

    if (!apiKey || apiKey.startsWith("sk-your-")) {
      throw new HttpException(
        "DeepSeek API Key 未配置，请在 backend/.env 中填写 DEEPSEEK_API_KEY",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const prompt = this.buildPrompt(dto);

    try {
      const { data } = await axios.post<DeepSeekChatResponse>(
        `${baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          model,
          messages: [
            {
              role: "system",
              content: buildSystemPrompt(),
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.8,
          max_tokens: 600,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 60_000,
        },
      );

      const content = data?.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new HttpException(
          "AI 未返回有效内容，请稍后重试",
          HttpStatus.BAD_GATEWAY,
        );
      }
      return { review: content };
    } catch (err) {
      if (err instanceof HttpException) throw err;

      const axiosErr = err as AxiosError<any>;
      const status = axiosErr.response?.status;
      const detail =
        axiosErr.response?.data?.error?.message ||
        axiosErr.response?.data?.message ||
        axiosErr.message ||
        "未知错误";
      this.logger.error(`调用 DeepSeek 失败: ${status ?? ""} ${detail}`);

      throw new HttpException(
        `调用 AI 服务失败：${detail}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private buildPrompt(dto: GenerateReviewDto): string {
    const { shopName, shopType } = dto;
    const typeLine = shopType ? `店铺类型：${shopType}\n` : "";
    return (
      `店铺名称：${shopName}\n` +
      typeLine +
      "请根据该店的大众印象和搜索常识，模拟一篇真实的随笔评价。"
    );
  }
}
