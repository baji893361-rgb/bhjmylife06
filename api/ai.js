const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";

function send(res, status, body) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(body));
}

function getSchema(task) {
  if (task === "meal-plan") {
    return {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: {
          type: "string"
        },
        meals: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              type: { type: "string" },
              name: { type: "string" },
              kcal: { type: "number" },
              protein: { type: "number" }
            },
            required: [
              "type",
              "name",
              "kcal",
              "protein"
            ]
          }
        }
      },
      required: [
        "summary",
        "meals"
      ]
    };
  }

  if (task === "single-meal") {
    return {
      type: "object",
      additionalProperties: false,
      properties: {
        meal: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { type: "string" },
            name: { type: "string" },
            kcal: { type: "number" },
            protein: { type: "number" },
            reason: { type: "string" }
          },
          required: [
            "type",
            "name",
            "kcal",
            "protein",
            "reason"
          ]
        }
      },
      required: ["meal"]
    };
  }

  if (task === "natural-log") {
    return {
      type: "object",
      additionalProperties: false,
      properties: {
        records: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              type: {
                type: "string",
                enum: [
                  "weight",
                  "workout",
                  "meal",
                  "purchase"
                ]
              },

              typeLabel: { type: "string" },
              summary: { type: "string" },
              date: { type: "string" },

              weight: { type: "number" },

              workoutType: { type: "string" },
              title: { type: "string" },
              minutes: { type: "number" },
              kcal: { type: "number" },
              detail: { type: "string" },
              memo: { type: "string" },

              name: { type: "string" },
              price: { type: "number" },
              qty: { type: "number" },
              unit: { type: "string" },
              category: { type: "string" },
              store: { type: "string" }
            },

            required: [
              "type",
              "typeLabel",
              "summary",
              "date",
              "weight",
              "workoutType",
              "title",
              "minutes",
              "kcal",
              "detail",
              "memo",
              "name",
              "price",
              "qty",
              "unit",
              "category",
              "store"
            ]
          }
        }
      },

      required: ["records"]
    };
  }

  if (task === "workout-image") {
    return {
      type: "object",
      additionalProperties: false,
      properties: {
        workoutType: { type: "string" },
        title: { type: "string" },
        minutes: { type: "number" },
        kcal: { type: "number" },
        detail: { type: "string" },
        memo: { type: "string" }
      },

      required: [
        "workoutType",
        "title",
        "minutes",
        "kcal",
        "detail",
        "memo"
      ]
    };
  }

  return null;
}

function getInstructions(task) {
  const base = `
너는 MY LIFE 개인 생활관리 앱의 AI다.

반드시 JSON Schema에 맞는 데이터만 반환한다.
한국어를 사용한다.

사용자가 제공하지 않은 사실은 임의로 만들지 않는다.

알 수 없는 필수 숫자는 0,
알 수 없는 필수 문자열은 빈 문자열로 반환한다.
`;

  if (task === "meal-plan") {
    return (
      base +
      `
사용자의 현재 식단과 요청을 분석해서
해당 날짜의 식단 변경안을 만든다.

사용자의 요청 조건을 우선한다.

칼로리와 단백질은
일반적인 식품 영양정보를 기반으로
현실적인 범위에서 추정한다.

식단 종류는 가능한 경우
아침 / 점심 / 저녁 / 간식 형태를 유지한다.
`
    );
  }

  if (task === "single-meal") {
    return (
      base +
      `
현재 한 끼 식단을
사용자의 요청에 맞게 수정한다.

변경된 식단과 함께
reason에 변경 이유를 짧게 작성한다.
`
    );
  }

  if (task === "natural-log") {
    return (
      base +
      `
사용자의 자연어 생활 기록을 분석해서
다음 기록으로 분류한다.

weight
workout
meal
purchase

한 문장에 여러 기록이 있으면
records 배열에 각각 분리한다.

구매 category는 가능한 경우 다음 중 선택한다.

식비
생활
뷰티
교통
데이트
쇼핑
구독
기타
`
    );
  }

  if (task === "workout-image") {
    return (
      base +
      `
운동 앱 캡처 이미지를 분석한다.

이미지에서 명확하게 확인할 수 있는 정보만 추출한다.

운동 종류,
운동명,
운동 시간,
소모 칼로리,
세트,
횟수,
중량 등을 추출한다.

세트 / 횟수 / 중량 등의 상세 운동 정보는
detail에 정리한다.

이미지에서 확인할 수 없는 값은 추측하지 않는다.
`
    );
  }

  return base;
}

function extractOutputText(data) {
  if (
    typeof data.output_text === "string" &&
    data.output_text
  ) {
    return data.output_text;
  }

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (!Array.isArray(item.content)) continue;

      for (const content of item.content) {
        if (
          typeof content.text === "string" &&
          content.text
        ) {
          return content.text;
        }
      }
    }
  }

  return "";
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return send(res, 200, {
      ok: true,
      message: "MY LIFE AI API is running"
    });
  }

  if (req.method !== "POST") {
    return send(res, 405, {
      error: "지원하지 않는 요청 방식입니다."
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return send(res, 500, {
      error:
        "Vercel에 OPENAI_API_KEY가 설정되지 않았습니다."
    });
  }

  try {
    const {
      task,
      payload = {},
      image = ""
    } = req.body || {};

    const schema = getSchema(task);

    if (!schema) {
      return send(res, 400, {
        error: "지원하지 않는 AI 작업입니다."
      });
    }

    const content = [
      {
        type: "input_text",
        text: JSON.stringify(payload)
      }
    ];

    if (task === "workout-image") {
      if (
        !image ||
        !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(
          image
        )
      ) {
        return send(res, 400, {
          error: "분석할 운동 이미지가 없습니다."
        });
      }

      content.push({
        type: "input_image",
        image_url: image
      });
    }

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${process.env.OPENAI_API_KEY}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          model: MODEL,

          instructions:
            getInstructions(task),

          input: [
            {
              role: "user",
              content
            }
          ],

          text: {
            format: {
              type: "json_schema",
              name: "mylife_result",
              strict: true,
              schema
            }
          }
        })
      }
    );

    const responseData =
      await openAIResponse
        .json()
        .catch(() => ({}));

    if (!openAIResponse.ok) {
      console.error(
        "OpenAI API ERROR:",
        responseData
      );

      return send(
        res,
        openAIResponse.status,
        {
          error:
            responseData?.error?.message ||
            "OpenAI API 요청에 실패했습니다."
        }
      );
    }

    const outputText =
      extractOutputText(responseData);

    if (!outputText) {
      console.error(
        "EMPTY OPENAI RESPONSE:",
        responseData
      );

      return send(res, 502, {
        error:
          "AI 응답 내용이 비어 있습니다."
      });
    }

    let parsed;

    try {
      parsed =
        JSON.parse(outputText);
    } catch (error) {
      console.error(
        "JSON PARSE ERROR:",
        outputText
      );

      return send(res, 502, {
        error:
          "AI 응답을 JSON으로 변환하지 못했습니다."
      });
    }

    return send(res, 200, {
      data: parsed
    });

  } catch (error) {
    console.error(
      "MY LIFE API ERROR:",
      error
    );

    return send(res, 500, {
      error:
        error?.message ||
        "MY LIFE AI 서버 오류가 발생했습니다."
    });
  }
}
