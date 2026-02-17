export function createOpenApiSpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "HR System API",
      version: "0.1.0",
    },
    servers: [{ url: "http://localhost:4000" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    paths: {
      "/api/health": {
        get: {
          summary: "Health check",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { ok: { type: "boolean" } },
                    required: ["ok"],
                  },
                },
              },
            },
          },
        },
      },
      "/api/auth/login": {
        post: {
          summary: "Login and get a JWT access token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                  required: ["email", "password"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Login OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      tokenType: { type: "string" },
                      accessToken: { type: "string" },
                      expiresIn: { type: "string" },
                      user: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          email: { type: "string" },
                          name: { type: "string" },
                          roles: { type: "array", items: { type: "string" } },
                        },
                        required: ["id", "email", "name", "roles"],
                      },
                    },
                    required: ["tokenType", "accessToken", "expiresIn", "user"],
                  },
                },
              },
            },
            "401": { description: "Invalid credentials" },
          },
        },
      },
      "/api/me": {
        get: {
          summary: "Get current user",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      user: {
                        type: "object",
                        properties: {
                          sub: { type: "string" },
                          email: { type: "string" },
                          name: { type: "string" },
                          roles: { type: "array", items: { type: "string" } }
                        },
                        required: ["sub", "email", "name", "roles"]
                      }
                    },
                    required: ["user"]
                  }
                }
              }
            },
            "401": { "description": "Missing/invalid token" }
          }
        }
      }
    }
  };
}
