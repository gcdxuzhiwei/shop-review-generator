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

  async generate(
    dto: GenerateReviewDto,
    ip: string,
  ): Promise<{ review: string }> {
    const apiKey = this.config.get<string>("DEEPSEEK_API_KEY");
    const baseUrl = "https://api.deepseek.com/v1";
    const model = "deepseek-v4-flash";

    if (!apiKey || apiKey.startsWith("sk-your-")) {
      throw new HttpException(
        "DeepSeek API Key 未配置，请在 backend/.env 中填写 DEEPSEEK_API_KEY",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const amapKey = this.config.get<string>("AMAP_KEY");
    let region: any = undefined;
    let amapData: any = undefined;
    if (amapKey) {
      if (ip) {
        try {
          const { data } = await axios.get("https://restapi.amap.com/v3/ip", {
            params: {
              key: amapKey,
              ip,
            },
          });
          region = data?.city?.length ? data.city : undefined;
        } catch (err) {
          const axiosErr = err as AxiosError<any>;
          const status = axiosErr.response?.status;
          const detail =
            axiosErr.response?.data?.error?.message ||
            axiosErr.response?.data?.message ||
            axiosErr.message ||
            "未知错误";
          this.logger.error(`调用 高德ip 失败: ${status ?? ""} ${detail}`);
        }
      }
      try {
        const { data } = await axios.get(
          "https://restapi.amap.com/v5/place/text",
          {
            params: {
              key: amapKey,
              keywords: dto.shopName,
              show_fields: "business",
              page_size: 1,
              region,
            },
          },
        );
        amapData = data?.pois?.[0] || undefined;

        if (region && !amapData) {
          try {
            const { data } = await axios.get(
              "https://restapi.amap.com/v5/place/text",
              {
                params: {
                  key: amapKey,
                  keywords: dto.shopName,
                  show_fields: "business",
                  page_size: 1,
                },
              },
            );
            amapData = data?.pois?.[0] || undefined;
          } catch (err) {
            const axiosErr = err as AxiosError<any>;
            const status = axiosErr.response?.status;
            const detail =
              axiosErr.response?.data?.error?.message ||
              axiosErr.response?.data?.message ||
              axiosErr.message ||
              "未知错误";
            this.logger.error(`调用 高德place 失败: ${status ?? ""} ${detail}`);
          }
        }
      } catch (err) {
        const axiosErr = err as AxiosError<any>;
        const status = axiosErr.response?.status;
        const detail =
          axiosErr.response?.data?.error?.message ||
          axiosErr.response?.data?.message ||
          axiosErr.message ||
          "未知错误";
        this.logger.error(`调用 高德place 失败: ${status ?? ""} ${detail}`);
      }
    }

    const prompt = this.buildPrompt(dto, amapData);

    const messages = [
      {
        role: "system",
        content: buildSystemPrompt(),
      },
      { role: "user", content: prompt },
    ];

    try {
      const { data } = await axios.post<DeepSeekChatResponse>(
        `${baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          model,
          messages,
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

  private buildPrompt(dto: GenerateReviewDto, amapData: any): string {
    const { shopName, shopType } = dto;
    const typeLine = shopType ? `店铺类型：${shopType}\n` : "";
    let amapLine = "";
    if (amapData) {
      amapLine += "【高德地图事实参考】\n";
      if (amapData.name) {
        amapLine += `- 名称：${amapData.name}\n`;
      }
      if (amapData.type) {
        amapLine += `- 所属类型：${amapData.type}\n`;
      }
      if (amapData.pname) {
        amapLine += `- 所属省份：${amapData.pname}\n`;
      }
      if (amapData.cityname) {
        amapLine += `- 所属城市：${amapData.cityname}\n`;
      }
      if (amapData.adname) {
        amapLine += `- 所属区县：${amapData.adname}\n`;
      }
      if (amapData.address) {
        amapLine += `- 详细地址：${amapData.address}\n`;
      }
      if (amapData.business?.business_area) {
        amapLine += `- 所属商圈：${amapData.business.business_area}\n`;
      }
      if (amapData.business?.opentime_today) {
        amapLine += `- 今日营业时间：${amapData.business.opentime_today}\n`;
      }
      if (amapData.business?.opentime_week) {
        amapLine += `- 营业时间描述：${amapData.business.opentime_week}\n`;
      }
      if (amapData.business?.tag) {
        amapLine += `- 特色内容：${amapData.business.tag}\n`;
      }
      if (amapData.business?.rating) {
        amapLine += `- 评分：${amapData.business.rating}\n`;
      }
      if (amapData.business?.cost) {
        amapLine += `- 人均消费：${amapData.business.cost}\n`;
      }
      if (amapData.business?.parking_type) {
        amapLine += `- 停车场类型：${amapData.business.parking_type}\n`;
      }
      if (amapData.business?.alias) {
        amapLine += `- 别名：${amapData.business.alias}\n`;
      }
      if (amapData.business?.keytag) {
        amapLine += `- 标识：${amapData.business.keytag}\n`;
      }
    }
    return `店铺名称：${shopName}\n` + typeLine + amapLine;
  }
}
