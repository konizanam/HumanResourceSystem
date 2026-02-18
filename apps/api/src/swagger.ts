export function createOpenApiSpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "HR System API",
      version: "0.2.0",
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
      /* ── Health ────────────────────────────────────── */
      "/api/health": {
        get: {
          tags: ["System"],
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

      /* ── Auth: Register ─────────────────────────────── */
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a new Job Seeker account",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                    confirmPassword: { type: "string" },
                  },
                  required: ["firstName", "lastName", "email", "password", "confirmPassword"],
                },
              },
            },
          },
          responses: {
            "201": { description: "Account created, JWT returned" },
            "409": { description: "Email already registered" },
            "400": { description: "Validation error" },
          },
        },
      },

      /* ── Auth: Login ────────────────────────────────── */
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
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
            "200": { description: "Login OK — JWT returned" },
            "401": { description: "Invalid credentials" },
          },
        },
      },

      /* ── Auth: Forgot Password ──────────────────────── */
      "/api/auth/forgot-password": {
        post: {
          tags: ["Auth"],
          summary: "Request a password reset link",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { email: { type: "string", format: "email" } },
                  required: ["email"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Reset link sent (if email exists)" },
          },
        },
      },

      /* ── Auth: Reset Password ───────────────────────── */
      "/api/auth/reset-password": {
        post: {
          tags: ["Auth"],
          summary: "Reset password using a token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string", format: "uuid" },
                    password: { type: "string" },
                    confirmPassword: { type: "string" },
                  },
                  required: ["token", "password", "confirmPassword"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Password reset successful" },
            "400": { description: "Invalid or expired token" },
          },
        },
      },

      /* ── Me ─────────────────────────────────────────── */
      "/api/me": {
        get: {
          tags: ["User"],
          summary: "Get current user",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Current user returned" },
            "401": { description: "Missing/invalid token" },
          },
        },
      },

      /* ── Job Seeker: Full Profile ───────────────────── */
      "/api/job-seeker/full-profile": {
        get: {
          tags: ["Job Seeker"],
          summary: "Get all profile sections in one call",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Full profile data" },
          },
        },
      },

      /* ── Job Seeker: Profile ────────────────────────── */
      "/api/job-seeker/profile": {
        get: {
          tags: ["Job Seeker"],
          summary: "Get professional summary",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Profile data" } },
        },
        put: {
          tags: ["Job Seeker"],
          summary: "Create or update professional summary",
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    professionalSummary: { type: "string" },
                    fieldOfExpertise: { type: "string" },
                    qualificationLevel: { type: "string" },
                    yearsExperience: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Updated profile" } },
        },
      },

      /* ── Job Seeker: Personal Details ───────────────── */
      "/api/job-seeker/personal-details": {
        get: {
          tags: ["Job Seeker"],
          summary: "Get personal details",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Personal details" } },
        },
        put: {
          tags: ["Job Seeker"],
          summary: "Create or update personal details",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Updated personal details" } },
        },
      },

      /* ── Job Seeker: Addresses ──────────────────────── */
      "/api/job-seeker/addresses": {
        get: {
          tags: ["Job Seeker"],
          summary: "List addresses",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Addresses array" } },
        },
        post: {
          tags: ["Job Seeker"],
          summary: "Add a new address",
          security: [{ bearerAuth: [] }],
          responses: { "201": { description: "Address created" } },
        },
      },

      /* ── Job Seeker: Education ──────────────────────── */
      "/api/job-seeker/education": {
        get: {
          tags: ["Job Seeker"],
          summary: "List education records",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Education array" } },
        },
        post: {
          tags: ["Job Seeker"],
          summary: "Add an education record",
          security: [{ bearerAuth: [] }],
          responses: { "201": { description: "Education record created" } },
        },
      },

      /* ── Job Seeker: Experience ─────────────────────── */
      "/api/job-seeker/experience": {
        get: {
          tags: ["Job Seeker"],
          summary: "List work experience records",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Experience array" } },
        },
        post: {
          tags: ["Job Seeker"],
          summary: "Add a work experience record",
          security: [{ bearerAuth: [] }],
          responses: { "201": { description: "Experience record created" } },
        },
      },

      /* ── Job Seeker: References ─────────────────────── */
      "/api/job-seeker/references": {
        get: {
          tags: ["Job Seeker"],
          summary: "List references",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "References array" } },
        },
        post: {
          tags: ["Job Seeker"],
          summary: "Add a reference",
          security: [{ bearerAuth: [] }],
          responses: { "201": { description: "Reference created" } },
        },
      },
    },
  };
}
