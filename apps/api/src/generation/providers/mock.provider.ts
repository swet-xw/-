import { Injectable } from "@nestjs/common";
import { ImageProvider } from "./image-provider";

@Injectable()
export class MockProvider implements ImageProvider {
  key = "mock" as const;
  label = "Mock Provider";
  capabilities = ["text_to_image", "image_to_image", "inpaint"] as const;

  async generate(request: any, taskId: string) {
    const size = request.size ?? "1024x1024";

    return {
      status: "succeeded" as const,
      images: [
        {
          url: `https://placehold.co/${size}/png?text=${encodeURIComponent(request.model)}`,
          mimeType: "image/png"
        }
      ],
      meta: {
        providerRequestId: `mock_${taskId}`,
        note: "Use this provider to verify the platform flow before wiring real APIs."
      }
    };
  }
}

