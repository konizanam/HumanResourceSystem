export function createOpenApiSpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "HR System API",
      version: "0.2.0",
    },
    servers: [{ url: "http://localhost:4000/api/v1" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Job: {
          type: "object",
          required: ["title", "description", "company", "location", "salary_min", "salary_max", "category", "experience_level", "employment_type", "application_deadline"],
          properties: {
            id: { type: "string", format: "uuid", description: "The auto-generated job ID" },
            title: { type: "string", description: "Job title" },
            description: { type: "string", description: "Job description" },
            company: { type: "string", description: "Company name" },
            location: { type: "string", description: "Job location" },
            salary_min: { type: "number", description: "Minimum salary" },
            salary_max: { type: "number", description: "Maximum salary" },
            salary_currency: { type: "string", default: "USD", description: "Salary currency" },
            category: { type: "string", description: "Job category" },
            experience_level: { 
              type: "string", 
              enum: ["Entry", "Intermediate", "Senior", "Lead"],
              description: "Required experience level"
            },
            employment_type: { 
              type: "string", 
              enum: ["Full-time", "Part-time", "Contract", "Internship"],
              description: "Type of employment"
            },
            remote: { type: "boolean", default: false, description: "Whether the job is remote" },
            requirements: { type: "array", items: { type: "string" }, description: "Job requirements" },
            responsibilities: { type: "array", items: { type: "string" }, description: "Job responsibilities" },
            benefits: { type: "array", items: { type: "string" }, description: "Job benefits" },
            application_deadline: { type: "string", format: "date-time", description: "Application deadline" },
            status: { 
              type: "string", 
              enum: ["active", "closed", "draft"], 
              default: "active",
              description: "Job status"
            },
            views: { type: "integer", default: 0, description: "Number of views" },
            applications_count: { type: "integer", default: 0, description: "Number of applications" },
            employer_id: { type: "string", format: "uuid", description: "ID of the employer who posted the job" },
            created_at: { type: "string", format: "date-time", description: "Creation timestamp" },
            updated_at: { type: "string", format: "date-time", description: "Last update timestamp" }
          }
        },
        Application: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid", description: "Application ID" },
            job_id: { type: "string", format: "uuid", description: "Job ID" },
            applicant_id: { type: "string", format: "uuid", description: "Applicant ID" },
            cover_letter: { type: "string", description: "Cover letter" },
            resume_url: { type: "string", description: "Resume URL" },
            status: { 
              type: "string", 
              enum: ["pending", "reviewed", "accepted", "rejected", "withdrawn"],
              default: "pending",
              description: "Application status"
            },
            notes: { type: "string", description: "HR/Employer notes" },
            reviewed_at: { type: "string", format: "date-time", description: "When the application was reviewed" },
            applicant_name: { type: "string", description: "Applicant name" },
            applicant_email: { type: "string", format: "email", description: "Applicant email" },
            job_title: { type: "string", description: "Job title" },
            company: { type: "string", description: "Company name" },
            created_at: { type: "string", format: "date-time", description: "Creation timestamp" },
            updated_at: { type: "string", format: "date-time", description: "Last update timestamp" }
          }
        },
        Resume: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid", description: "Resume ID" },
            job_seeker_id: { type: "string", format: "uuid", description: "Job seeker ID" },
            file_name: { type: "string", description: "Original filename" },
            file_path: { type: "string", description: "File path on server" },
            file_size: { type: "integer", description: "File size in bytes" },
            mime_type: { type: "string", description: "MIME type" },
            is_primary: { type: "boolean", description: "Whether this is the primary resume" },
            uploaded_at: { type: "string", format: "date-time", description: "Upload timestamp" },
            updated_at: { type: "string", format: "date-time", description: "Last update timestamp" },
            created_at: { type: "string", format: "date-time", description: "Creation timestamp" },
            download_url: { type: "string", description: "URL to download the resume" }
          }
        },
        EmployerProfile: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid", description: "Employer ID" },
            email: { type: "string", format: "email", description: "Email address" },
            firstName: { type: "string", description: "First name" },
            lastName: { type: "string", description: "Last name" },
            company_name: { type: "string", description: "Company name" },
            company_description: { type: "string", description: "Company description" },
            company_website: { type: "string", description: "Company website" },
            company_logo_url: { type: "string", description: "Company logo URL" },
            company_size: { 
              type: "string", 
              enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
              description: "Company size"
            },
            industry: { type: "string", description: "Industry" },
            founded_year: { type: "integer", description: "Year founded" },
            headquarters_location: { type: "string", description: "Headquarters location" },
            phone: { type: "string", description: "Phone number" },
            is_verified: { type: "boolean", description: "Whether the employer is verified" },
            created_at: { type: "string", format: "date-time", description: "Creation timestamp" },
            updated_at: { type: "string", format: "date-time", description: "Last update timestamp" }
          }
        },
        EmployerStats: {
          type: "object",
          properties: {
            total_jobs_posted: { type: "integer", description: "Total jobs posted" },
            active_jobs: { type: "integer", description: "Currently active jobs" },
            total_applications_received: { type: "integer", description: "Total applications received" },
            total_views: { type: "integer", description: "Total job views" },
            average_response_time: { type: "integer", description: "Average response time in hours" },
            last_active: { type: "string", format: "date-time", description: "Last active timestamp" }
          }
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", description: "Error message" },
            errors: { 
              type: "array", 
              items: { type: "object" },
              description: "Validation errors"
            }
          }
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer", description: "Current page number" },
            limit: { type: "integer", description: "Items per page" },
            total: { type: "integer", description: "Total number of items" },
            pages: { type: "integer", description: "Total number of pages" }
          }
        }
      }
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

      /* ── Job Seeker: Skills Management ───────────────── */
"/api/job-seeker/skills": {
  get: {
    tags: ["Job Seeker"],
    summary: "Get all skills for the logged-in job seeker",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "query",
        name: "proficiency",
        schema: { type: "string", enum: ["Beginner", "Intermediate", "Advanced", "Expert"] },
        description: "Filter by proficiency level"
      },
      {
        in: "query",
        name: "is_primary",
        schema: { type: "boolean" },
        description: "Filter by primary skills"
      },
      {
        in: "query",
        name: "search",
        schema: { type: "string" },
        description: "Search skills by name"
      }
    ],
    responses: {
      "200": {
        description: "List of skills",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                skills: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Skill" }
                },
                total_count: { type: "integer" },
                primary_count: { type: "integer" }
              }
            }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" }
    }
  },
  post: {
    tags: ["Job Seeker"],
    summary: "Add a new skill",
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["name"],
            properties: {
              name: { type: "string" },
              proficiency_level: { 
                type: "string", 
                enum: ["Beginner", "Intermediate", "Advanced", "Expert"] 
              },
              years_of_experience: { type: "integer", minimum: 0, maximum: 50 },
              is_primary: { type: "boolean", default: false }
            }
          }
        }
      }
    },
    responses: {
      "201": {
        description: "Skill added successfully",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Skill" }
          }
        }
      },
      "400": { description: "Validation error" },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "409": { description: "Skill already exists" }
    }
  }
},
"/api/job-seeker/skills/{id}": {
  delete: {
    tags: ["Job Seeker"],
    summary: "Delete a skill",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        schema: { type: "string", format: "uuid" }
      }
    ],
    responses: {
      "200": {
        description: "Skill deleted successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string" },
                deleted_skill: { $ref: "#/components/schemas/Skill" }
              }
            }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "Skill not found" }
    }
  }
},
"/api/job-seeker/skills/{id}/primary": {
  patch: {
    tags: ["Job Seeker"],
    summary: "Set a skill as primary",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        schema: { type: "string", format: "uuid" }
      }
    ],
    responses: {
      "200": {
        description: "Skill set as primary successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string" },
                skill: { $ref: "#/components/schemas/Skill" }
              }
            }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "Skill not found" }
    }
  }
},

/* ── Job Seeker: Certifications Management ───────── */
"/api/job-seeker/certifications": {
  get: {
    tags: ["Job Seeker"],
    summary: "Get all certifications for the logged-in job seeker",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "query",
        name: "issuer",
        schema: { type: "string" },
        description: "Filter by issuing organization"
      },
      {
        in: "query",
        name: "search",
        schema: { type: "string" },
        description: "Search by certification name"
      },
      {
        in: "query",
        name: "sort",
        schema: { type: "string", enum: ["newest", "oldest", "expiring_soon"], default: "newest" }
      }
    ],
    responses: {
      "200": {
        description: "List of certifications",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                certifications: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Certification" }
                },
                total_count: { type: "integer" },
                expired_count: { type: "integer" },
                expiring_soon_count: { type: "integer" }
              }
            }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" }
    }
  },
  post: {
    tags: ["Job Seeker"],
    summary: "Add a new certification",
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["name", "issuing_organization", "issue_date"],
            properties: {
              name: { type: "string" },
              issuing_organization: { type: "string" },
              issue_date: { type: "string", format: "date" },
              expiration_date: { type: "string", format: "date" },
              credential_id: { type: "string" },
              credential_url: { type: "string" },
              does_not_expire: { type: "boolean", default: false },
              description: { type: "string" }
            }
          }
        }
      }
    },
    responses: {
      "201": {
        description: "Certification added successfully",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Certification" }
          }
        }
      },
      "400": { description: "Validation error" },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" }
    }
  }
},
"/api/job-seeker/certifications/{id}": {
  get: {
    tags: ["Job Seeker"],
    summary: "Get a specific certification",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        schema: { type: "string", format: "uuid" }
      }
    ],
    responses: {
      "200": {
        description: "Certification details",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Certification" }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "Certification not found" }
    }
  },
  put: {
    tags: ["Job Seeker"],
    summary: "Update a certification",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        schema: { type: "string", format: "uuid" }
      }
    ],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              issuing_organization: { type: "string" },
              issue_date: { type: "string", format: "date" },
              expiration_date: { type: "string", format: "date" },
              credential_id: { type: "string" },
              credential_url: { type: "string" },
              does_not_expire: { type: "boolean" },
              description: { type: "string" }
            }
          }
        }
      }
    },
    responses: {
      "200": {
        description: "Certification updated successfully",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Certification" }
          }
        }
      },
      "400": { description: "Validation error" },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "Certification not found" }
    }
  },
  delete: {
    tags: ["Job Seeker"],
    summary: "Delete a certification",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        schema: { type: "string", format: "uuid" }
      }
    ],
    responses: {
      "200": {
        description: "Certification deleted successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string" },
                deleted_certification: { $ref: "#/components/schemas/Certification" }
              }
            }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "Certification not found" }
    }
  }
},

      /* ── Job Seeker: Resume Management ───────────────── */
      "/api/job-seeker/resume": {
        post: {
          tags: ["Job Seeker"],
          summary: "Upload a new resume",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["resume"],
                  properties: {
                    resume: {
                      type: "string",
                      format: "binary",
                      description: "Resume file (PDF, DOC, DOCX only, max 5MB)"
                    },
                    is_primary: {
                      type: "boolean",
                      description: "Set as primary resume"
                    }
                  }
                }
              }
            }
          },
          responses: {
            "201": {
              description: "Resume uploaded successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Resume" }
                }
              }
            },
            "400": { description: "Validation error or invalid file" },
            "401": { description: "Unauthorized" },
            "403": { description: "Forbidden" },
            "413": { description: "File too large" }
          }
        },
        get: {
          tags: ["Job Seeker"],
          summary: "Get all resumes for the logged-in job seeker",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "query",
              name: "include_download_urls",
              schema: { type: "boolean", default: true }
            }
          ],
          responses: {
            "200": {
              description: "List of resumes",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      resumes: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Resume" }
                      },
                      primary_resume: { $ref: "#/components/schemas/Resume" },
                      total_count: { type: "integer" }
                    }
                  }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "403": { description: "Forbidden" }
          }
        }
      },
      "/api/job-seeker/resume/{id}": {
        get: {
          tags: ["Job Seeker"],
          summary: "Get a specific resume",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" }
            }
          ],
          responses: {
            "200": {
              description: "Resume details",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Resume" }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "403": { description: "Forbidden" },
            "404": { description: "Resume not found" }
          }
        },
        delete: {
          tags: ["Job Seeker"],
          summary: "Delete a resume",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" }
            }
          ],
          responses: {
            "200": {
              description: "Resume deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string" },
                      deleted_resume: { $ref: "#/components/schemas/Resume" }
                    }
                  }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "403": { description: "Forbidden" },
            "404": { description: "Resume not found" }
          }
        }
      },
      "/api/job-seeker/resume/{id}/download": {
        get: {
          tags: ["Job Seeker"],
          summary: "Download resume file",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" }
            }
          ],
          responses: {
            "200": {
              description: "Resume file",
              content: {
                "application/pdf": {
                  schema: { type: "string", format: "binary" }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "403": { description: "Forbidden" },
            "404": { description: "Resume not found" }
          }
        }
      },
      "/api/job-seeker/resume/{id}/primary": {
        patch: {
          tags: ["Job Seeker"],
          summary: "Set a resume as primary",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" }
            }
          ],
          responses: {
            "200": {
              description: "Resume set as primary successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string" },
                      resume: { $ref: "#/components/schemas/Resume" }
                    }
                  }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "403": { description: "Forbidden" },
            "404": { description: "Resume not found" }
          }
        }
      },

      /* ── EMPLOYER ENDPOINTS ─────────────────────────── */
      "/api/employers/register": {
        post: {
          tags: ["Employers"],
          summary: "Register a new employer account",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "confirmPassword", "company_name", "firstName", "lastName"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                    confirmPassword: { type: "string" },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    company_name: { type: "string" },
                    company_description: { type: "string" },
                    company_website: { type: "string" },
                    company_size: { type: "string", enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"] },
                    industry: { type: "string" },
                    founded_year: { type: "integer", minimum: 1800 },
                    headquarters_location: { type: "string" },
                    phone: { type: "string" }
                  }
                }
              }
            }
          },
          responses: {
            "201": {
              description: "Employer registered successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string" },
                      employer: { $ref: "#/components/schemas/EmployerProfile" },
                      token: { type: "string" }
                    }
                  }
                }
              }
            },
            "400": { description: "Validation error" },
            "409": { description: "Email already registered" }
          }
        }
      },
      "/api/employers/profile": {
        get: {
          tags: ["Employers"],
          summary: "Get employer profile",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Employer profile",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      profile: { $ref: "#/components/schemas/EmployerProfile" },
                      stats: { $ref: "#/components/schemas/EmployerStats" }
                    }
                  }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "403": { description: "Forbidden - Employer access required" },
            "404": { description: "Employer not found" }
          }
        },
        put: {
          tags: ["Employers"],
          summary: "Update employer profile",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    company_name: { type: "string" },
                    company_description: { type: "string" },
                    company_website: { type: "string" },
                    company_logo_url: { type: "string" },
                    company_size: { type: "string", enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"] },
                    industry: { type: "string" },
                    founded_year: { type: "integer" },
                    headquarters_location: { type: "string" },
                    phone: { type: "string" }
                  }
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Profile updated successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/EmployerProfile" }
                }
              }
            },
            "400": { description: "Validation error" },
            "401": { description: "Unauthorized" },
            "403": { description: "Forbidden" },
            "404": { description: "Employer not found" }
          }
        }
      },
      "/api/employers/jobs": {
        get: {
          tags: ["Employers"],
          summary: "Get employer's jobs",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "query",
              name: "page",
              schema: { type: "integer", minimum: 1, default: 1 }
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
            },
            {
              in: "query",
              name: "status",
              schema: { type: "string", enum: ["active", "closed", "draft"] }
            },
            {
              in: "query",
              name: "sort",
              schema: { type: "string", enum: ["newest", "oldest", "most_viewed", "most_applied"], default: "newest" }
            }
          ],
          responses: {
            "200": {
              description: "List of employer's jobs",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      jobs: { type: "array", items: { $ref: "#/components/schemas/Job" } },
                      pagination: { $ref: "#/components/schemas/Pagination" },
                      summary: {
                        type: "object",
                        properties: {
                          total_jobs: { type: "integer" },
                          active_jobs: { type: "integer" },
                          draft_jobs: { type: "integer" },
                          closed_jobs: { type: "integer" },
                          total_applications: { type: "integer" },
                          total_views: { type: "integer" }
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "403": { description: "Forbidden" }
          }
        }
      },
      "/api/employers/applications": {
        get: {
          tags: ["Employers"],
          summary: "Get all applications for employer's jobs",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "query",
              name: "page",
              schema: { type: "integer", minimum: 1, default: 1 }
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
            },
            {
              in: "query",
              name: "status",
              schema: { type: "string", enum: ["pending", "reviewed", "accepted", "rejected", "withdrawn"] }
            },
            {
              in: "query",
              name: "job_id",
              schema: { type: "string", format: "uuid" },
              description: "Filter by specific job"
            },
            {
              in: "query",
              name: "sort",
              schema: { type: "string", enum: ["newest", "oldest"], default: "newest" }
            }
          ],
          responses: {
            "200": {
              description: "List of applications",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      applications: { type: "array", items: { $ref: "#/components/schemas/Application" } },
                      pagination: { $ref: "#/components/schemas/Pagination" },
                      summary: {
                        type: "object",
                        properties: {
                          total_applications: { type: "integer" },
                          pending: { type: "integer" },
                          reviewed: { type: "integer" },
                          accepted: { type: "integer" },
                          rejected: { type: "integer" },
                          withdrawn: { type: "integer" }
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "403": { description: "Forbidden" }
          }
        }
      },
      "/api/employers/dashboard": {
        get: {
          tags: ["Employers"],
          summary: "Get employer dashboard overview",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Dashboard overview",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      profile: { $ref: "#/components/schemas/EmployerProfile" },
                      stats: { $ref: "#/components/schemas/EmployerStats" },
                      recent_jobs: { type: "array", items: { $ref: "#/components/schemas/Job" } },
                      recent_applications: { type: "array", items: { $ref: "#/components/schemas/Application" } },
                      chart_data: {
                        type: "object",
                        properties: {
                          applications_over_time: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                date: { type: "string" },
                                count: { type: "integer" }
                              }
                            }
                          },
                          jobs_by_status: {
                            type: "object",
                            properties: {
                              active: { type: "integer" },
                              draft: { type: "integer" },
                              closed: { type: "integer" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "403": { description: "Forbidden" }
          }
        }
      },

      /* ── JOBS ENDPOINTS ─────────────────────────────── */
      "/api/jobs": {
        get: {
          tags: ["Jobs"],
          summary: "List all jobs",
          description: "Returns a paginated list of jobs. Public endpoint shows only active jobs. Authenticated employers can see their own jobs with status filters.",
          parameters: [
            {
              in: "query",
              name: "page",
              schema: { type: "integer", minimum: 1, default: 1 },
              description: "Page number"
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
              description: "Number of items per page"
            },
            {
              in: "query",
              name: "status",
              schema: { type: "string", enum: ["active", "closed", "draft"] },
              description: "Filter by job status (employers only)"
            },
            {
              in: "query",
              name: "my_jobs",
              schema: { type: "boolean" },
              description: "Show only my jobs (requires authentication)"
            }
          ],
          responses: {
            "200": {
              description: "List of jobs",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      jobs: { type: "array", items: { $ref: "#/components/schemas/Job" } },
                      pagination: { $ref: "#/components/schemas/Pagination" },
                      showing: { type: "string", enum: ["my_jobs", "all_jobs"] }
                    }
                  }
                }
              }
            },
            "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }
          }
        },
        post: {
          tags: ["Jobs"],
          summary: "Create a new job",
          description: "Create a new job posting (Employer only)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "description", "company", "location", "salary_min", "salary_max", "category", "experience_level", "employment_type", "application_deadline"],
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    company: { type: "string" },
                    location: { type: "string" },
                    salary_min: { type: "number" },
                    salary_max: { type: "number" },
                    salary_currency: { type: "string", default: "USD" },
                    category: { type: "string" },
                    experience_level: { type: "string", enum: ["Entry", "Intermediate", "Senior", "Lead"] },
                    employment_type: { type: "string", enum: ["Full-time", "Part-time", "Contract", "Internship"] },
                    remote: { type: "boolean", default: false },
                    requirements: { type: "array", items: { type: "string" } },
                    responsibilities: { type: "array", items: { type: "string" } },
                    benefits: { type: "array", items: { type: "string" } },
                    application_deadline: { type: "string", format: "date-time" },
                    status: { type: "string", enum: ["active", "closed", "draft"], default: "active" }
                  }
                }
              }
            }
          },
          responses: {
            "201": { description: "Job created successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/Job" } } } },
            "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "403": { description: "Forbidden - Employer access required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }
          }
        }
      },
      "/api/jobs/search": {
        get: {
          tags: ["Jobs"],
          summary: "Search jobs",
          description: "Search jobs by title, description, location, and salary range",
          parameters: [
            {
              in: "query",
              name: "q",
              schema: { type: "string" },
              description: "Search query for title and description"
            },
            {
              in: "query",
              name: "location",
              schema: { type: "string" },
              description: "Job location"
            },
            {
              in: "query",
              name: "min_salary",
              schema: { type: "integer" },
              description: "Minimum salary"
            },
            {
              in: "query",
              name: "max_salary",
              schema: { type: "integer" },
              description: "Maximum salary"
            }
          ],
          responses: {
            "200": {
              description: "Search results",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Job" }
                  }
                }
              }
            },
            "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }
          }
        }
      },
      "/api/jobs/filter": {
        get: {
          tags: ["Jobs"],
          summary: "Filter jobs",
          description: "Filter jobs by various criteria",
          parameters: [
            {
              in: "query",
              name: "category",
              schema: { type: "string" },
              description: "Job category"
            },
            {
              in: "query",
              name: "experience_level",
              schema: { type: "string", enum: ["Entry", "Intermediate", "Senior", "Lead"] },
              description: "Required experience level"
            },
            {
              in: "query",
              name: "employment_type",
              schema: { type: "string", enum: ["Full-time", "Part-time", "Contract", "Internship"] },
              description: "Type of employment"
            },
            {
              in: "query",
              name: "remote",
              schema: { type: "boolean" },
              description: "Remote jobs only"
            },
            {
              in: "query",
              name: "min_salary",
              schema: { type: "integer" },
              description: "Minimum salary"
            },
            {
              in: "query",
              name: "max_salary",
              schema: { type: "integer" },
              description: "Maximum salary"
            }
          ],
          responses: {
            "200": {
              description: "Filtered jobs",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Job" }
                  }
                }
              }
            },
            "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }
          }
        }
      },
      "/api/jobs/employer/dashboard": {
        get: {
          tags: ["Jobs"],
          summary: "Get employer dashboard",
          description: "Get employer dashboard with job statistics (Employer only)",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Employer dashboard data",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      stats: {
                        type: "object",
                        properties: {
                          total_jobs: { type: "integer" },
                          active_jobs: { type: "integer" },
                          draft_jobs: { type: "integer" },
                          closed_jobs: { type: "integer" },
                          total_views: { type: "integer" },
                          total_applications: { type: "integer" },
                          avg_views_per_job: { type: "number" }
                        }
                      },
                      recent_applications: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Application" }
                      },
                      jobs: {
                        type: "array",
                        items: {
                          allOf: [
                            { $ref: "#/components/schemas/Job" },
                            {
                              type: "object",
                              properties: {
                                application_count: { type: "integer" },
                                pending_count: { type: "integer" },
                                reviewed_count: { type: "integer" },
                                accepted_count: { type: "integer" },
                                rejected_count: { type: "integer" }
                              }
                            }
                          ]
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "403": { description: "Forbidden - Employer access required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }
          }
        }
      },
      "/api/jobs/employer/jobs": {
        get: {
          tags: ["Jobs"],
          summary: "Get employer's jobs",
          description: "Get all jobs for the logged-in employer with application counts",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "query",
              name: "page",
              schema: { type: "integer", minimum: 1, default: 1 },
              description: "Page number"
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
              description: "Items per page"
            },
            {
              in: "query",
              name: "status",
              schema: { type: "string", enum: ["active", "closed", "draft"] },
              description: "Filter by status"
            }
          ],
          responses: {
            "200": {
              description: "List of employer's jobs",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      jobs: {
                        type: "array",
                        items: {
                          allOf: [
                            { $ref: "#/components/schemas/Job" },
                            {
                              type: "object",
                              properties: {
                                applications_count: { type: "integer" },
                                pending_applications: { type: "integer" },
                                reviewed_applications: { type: "integer" },
                                accepted_applications: { type: "integer" },
                                rejected_applications: { type: "integer" }
                              }
                            }
                          ]
                        }
                      },
                      pagination: { $ref: "#/components/schemas/Pagination" }
                    }
                  }
                }
              }
            },
            "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "403": { description: "Forbidden - Employer access required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }
          }
        }
      },
      "/api/jobs/{id}": {
        get: {
          tags: ["Jobs"],
          summary: "Get single job details",
          description: "Get detailed information about a specific job",
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
              description: "Job ID"
            }
          ],
          responses: {
            "200": {
              description: "Job details",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/Job" },
                      {
                        type: "object",
                        properties: {
                          employer_name: { type: "string" },
                          employer_email: { type: "string" },
                          employer_company: { type: "string" },
                          applications: { $ref: "#/components/schemas/Application" }
                        }
                      }
                    ]
                  }
                }
              }
            },
            "404": { description: "Job not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "403": { description: "Forbidden - Job not publicly available", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }
          }
        },
        put: {
          tags: ["Jobs"],
          summary: "Update a job",
          description: "Update an existing job (Employer who owns it or Admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
              description: "Job ID"
            }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    company: { type: "string" },
                    location: { type: "string" },
                    salary_min: { type: "number" },
                    salary_max: { type: "number" },
                    salary_currency: { type: "string" },
                    category: { type: "string" },
                    experience_level: { type: "string", enum: ["Entry", "Intermediate", "Senior", "Lead"] },
                    employment_type: { type: "string", enum: ["Full-time", "Part-time", "Contract", "Internship"] },
                    remote: { type: "boolean" },
                    requirements: { type: "array", items: { type: "string" } },
                    responsibilities: { type: "array", items: { type: "string" } },
                    benefits: { type: "array", items: { type: "string" } },
                    application_deadline: { type: "string", format: "date-time" },
                    status: { type: "string", enum: ["active", "closed", "draft"] }
                  }
                }
              }
            }
          },
          responses: {
            "200": { description: "Job updated successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/Job" } } } },
            "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "403": { description: "Forbidden - Not authorized to update this job", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "404": { description: "Job not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }
          }
        },
        delete: {
          tags: ["Jobs"],
          summary: "Delete a job",
          description: "Delete a job (Employer who owns it or Admin). If the job has applications, it will be marked as closed instead of deleted.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
              description: "Job ID"
            }
          ],
          responses: {
            "200": {
              description: "Job deleted or closed successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string" },
                      job_title: { type: "string" },
                      status: { type: "string" }
                    }
                  }
                }
              }
            },
            "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "403": { description: "Forbidden - Not authorized to delete this job", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "404": { description: "Job not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }
          }
        }
      },
      "/api/jobs/{id}/applications": {
        get: {
          tags: ["Jobs"],
          summary: "Get applications for a job",
          description: "Get all applications for a specific job (Employer who owns it or Admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
              description: "Job ID"
            },
            {
              in: "query",
              name: "status",
              schema: { type: "string", enum: ["pending", "reviewed", "accepted", "rejected"] },
              description: "Filter by application status"
            },
            {
              in: "query",
              name: "page",
              schema: { type: "integer", minimum: 1, default: 1 },
              description: "Page number"
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
              description: "Items per page"
            }
          ],
          responses: {
            "200": {
              description: "List of applications",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      job_title: { type: "string" },
                      applications: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Application" }
                      },
                      pagination: { $ref: "#/components/schemas/Pagination" }
                    }
                  }
                }
              }
            },
            "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "403": { description: "Forbidden - Not authorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "404": { description: "Job not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }
          }
        }
      },
      "/api/jobs/{id}/applications/{applicationId}/status": {
        patch: {
          tags: ["Jobs"],
          summary: "Update application status",
          description: "Update the status of a job application (Employer who owns the job or Admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
              description: "Job ID"
            },
            {
              in: "path",
              name: "applicationId",
              required: true,
              schema: { type: "string", format: "uuid" },
              description: "Application ID"
            }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: {
                    status: {
                      type: "string",
                      enum: ["pending", "reviewed", "accepted", "rejected"],
                      description: "New application status"
                    }
                  }
                }
              }
            }
          },
          responses: {
            "200": { description: "Application status updated", content: { "application/json": { schema: { $ref: "#/components/schemas/Application" } } } },
            "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "403": { description: "Forbidden - Not authorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "404": { description: "Application not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }
          }
        }
      },

      /* ── APPLICATIONS ENDPOINTS ───────────────────────── */
      "/api/applications": {
        post: {
          tags: ["Applications"],
          summary: "Apply for a job",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["job_id"],
                  properties: {
                    job_id: { type: "string", format: "uuid" },
                    cover_letter: { type: "string" },
                    resume_url: { type: "string" }
                  }
                }
              }
            }
          },
          responses: {
            "201": { 
              description: "Application submitted successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Application" }
                }
              }
            },
            "400": { 
              description: "Validation error or duplicate application",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            },
            "401": { 
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            },
            "403": { 
              description: "Cannot apply to closed/draft job",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            },
            "404": { 
              description: "Job not found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            }
          }
        },
        get: {
          tags: ["Applications"],
          summary: "Get my applications",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "query",
              name: "page",
              schema: { type: "integer", minimum: 1, default: 1 }
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
            },
            {
              in: "query",
              name: "status",
              schema: { type: "string", enum: ["pending", "reviewed", "accepted", "rejected", "withdrawn"] }
            }
          ],
          responses: {
            "200": {
              description: "List of applications",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      applications: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Application" }
                      },
                      pagination: { $ref: "#/components/schemas/Pagination" }
                    }
                  }
                }
              }
            },
            "401": { 
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            }
          }
        }
      },
      "/api/applications/{id}": {
        get: {
          tags: ["Applications"],
          summary: "Get application details",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" }
            }
          ],
          responses: {
            "200": {
              description: "Application details",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Application" }
                }
              }
            },
            "401": { 
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            },
            "403": { 
              description: "Forbidden - Not your application",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            },
            "404": { 
              description: "Application not found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            }
          }
        },
        delete: {
          tags: ["Applications"],
          summary: "Withdraw application",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" }
            }
          ],
          responses: {
            "200": {
              description: "Application withdrawn successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string" },
                      application: { $ref: "#/components/schemas/Application" }
                    }
                  }
                }
              }
            },
            "401": { 
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            },
            "403": { 
              description: "Forbidden - Not your application",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            },
            "404": { 
              description: "Application not found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            }
          }
        }
      },
      "/api/applications/{id}/status": {
        put: {
          tags: ["Applications"],
          summary: "Update application status",
          description: "HR/Employer only",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" }
            }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: {
                    status: {
                      type: "string",
                      enum: ["pending", "reviewed", "accepted", "rejected"]
                    },
                    notes: { type: "string" }
                  }
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Status updated successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Application" }
                }
              }
            },
            "400": { 
              description: "Validation error",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            },
            "401": { 
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            },
            "403": { 
              description: "Forbidden - Not authorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            },
            "404": { 
              description: "Application not found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            }
          }
        }
      },
      "/api/applications/employer/jobs": {
        get: {
          tags: ["Applications"],
          summary: "Get applications for employer's jobs",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "query",
              name: "page",
              schema: { type: "integer", minimum: 1, default: 1 }
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
            },
            {
              in: "query",
              name: "status",
              schema: { type: "string", enum: ["pending", "reviewed", "accepted", "rejected", "withdrawn"] }
            },
            {
              in: "query",
              name: "job_id",
              schema: { type: "string", format: "uuid" },
              description: "Filter by specific job"
            }
          ],
          responses: {
            "200": {
              description: "List of applications",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      applications: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Application" }
                      },
                      pagination: { $ref: "#/components/schemas/Pagination" }
                    }
                  }
                }
              }
            },
            "401": { 
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            },
            "403": { 
              description: "Forbidden - Employer access required",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
            }
          }
        }
      },
      /* ── NOTIFICATIONS ENDPOINTS ─────────────────────── */
"/api/notifications": {
  get: {
    tags: ["Notifications"],
    summary: "Get user notifications",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "query",
        name: "page",
        schema: { type: "integer", minimum: 1, default: 1 }
      },
      {
        in: "query",
        name: "limit",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
      },
      {
        in: "query",
        name: "is_read",
        schema: { type: "boolean" },
        description: "Filter by read/unread status"
      },
      {
        in: "query",
        name: "type",
        schema: { 
          type: "string", 
          enum: ["application_received", "application_status_changed", "job_posted", "job_closed", "interview_scheduled", "message_received", "profile_viewed", "system_alert"] 
        }
      },
      {
        in: "query",
        name: "priority",
        schema: { type: "string", enum: ["low", "normal", "high", "urgent"] }
      },
      {
        in: "query",
        name: "from_date",
        schema: { type: "string", format: "date" }
      },
      {
        in: "query",
        name: "to_date",
        schema: { type: "string", format: "date" }
      },
      {
        in: "query",
        name: "sort",
        schema: { type: "string", enum: ["newest", "oldest"], default: "newest" }
      }
    ],
    responses: {
      "200": {
        description: "List of notifications",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                notifications: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Notification" }
                },
                pagination: { $ref: "#/components/schemas/Pagination" },
                unread_count: { $ref: "#/components/schemas/UnreadCount" }
              }
            }
          }
        }
      },
      "401": { description: "Unauthorized" }
    }
  },
  delete: {
    tags: ["Notifications"],
    summary: "Delete all notifications",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "query",
        name: "only_read",
        schema: { type: "boolean", default: true },
        description: "Delete only read notifications"
      },
      {
        in: "query",
        name: "older_than",
        schema: { type: "string", format: "date" },
        description: "Delete notifications older than this date"
      }
    ],
    responses: {
      "200": {
        description: "Notifications deleted successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string" },
                count: { type: "integer" }
              }
            }
          }
        }
      },
      "401": { description: "Unauthorized" }
    }
  }
},
"/api/notifications/unread-count": {
  get: {
    tags: ["Notifications"],
    summary: "Get unread notification count",
    security: [{ bearerAuth: [] }],
    responses: {
      "200": {
        description: "Unread notification counts",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UnreadCount" }
          }
        }
      },
      "401": { description: "Unauthorized" }
    }
  }
},
"/api/notifications/read-all": {
  put: {
    tags: ["Notifications"],
    summary: "Mark all notifications as read",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "query",
        name: "type",
        schema: { 
          type: "string", 
          enum: ["application_received", "application_status_changed", "job_posted", "job_closed", "interview_scheduled", "message_received", "profile_viewed", "system_alert"] 
        }
      },
      {
        in: "query",
        name: "priority",
        schema: { type: "string", enum: ["low", "normal", "high", "urgent"] }
      }
    ],
    responses: {
      "200": {
        description: "Notifications marked as read",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string" },
                count: { type: "integer" }
              }
            }
          }
        }
      },
      "401": { description: "Unauthorized" }
    }
  }
},
"/api/notifications/{id}": {
  get: {
    tags: ["Notifications"],
    summary: "Get a single notification",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        schema: { type: "string", format: "uuid" }
      }
    ],
    responses: {
      "200": {
        description: "Notification details",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Notification" }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "Notification not found" }
    }
  },
  delete: {
    tags: ["Notifications"],
    summary: "Delete a notification",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        schema: { type: "string", format: "uuid" }
      }
    ],
    responses: {
      "200": {
        description: "Notification deleted successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string" }
              }
            }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "Notification not found" }
    }
  }
},
"/api/notifications/{id}/read": {
  put: {
    tags: ["Notifications"],
    summary: "Mark a notification as read",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        schema: { type: "string", format: "uuid" }
      }
    ],
    responses: {
      "200": {
        description: "Notification marked as read",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Notification" }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "Notification not found" }
    }
  }
},
"/api/notifications/preferences": {
  get: {
    tags: ["Notifications"],
    summary: "Get notification preferences",
    security: [{ bearerAuth: [] }],
    responses: {
      "200": {
        description: "Notification preferences",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/NotificationPreferences" }
          }
        }
      },
      "401": { description: "Unauthorized" }
    }
  },
  put: {
    tags: ["Notifications"],
    summary: "Update notification preferences",
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              email_notifications: { type: "boolean" },
              push_notifications: { type: "boolean" },
              in_app_notifications: { type: "boolean" },
              application_updates: { type: "boolean" },
              job_alerts: { type: "boolean" },
              message_notifications: { type: "boolean" },
              marketing_emails: { type: "boolean" }
            }
          }
        }
      }
    },
    responses: {
      "200": {
        description: "Preferences updated successfully",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/NotificationPreferences" }
          }
        }
      },
      "400": { description: "Validation error" },
      "401": { description: "Unauthorized" }
    }
  }
},
/* ── ADMIN ENDPOINTS ─────────────────────────────── */
"/api/admin/users": {
  get: {
    tags: ["Admin"],
    summary: "Get all users with filters",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "query",
        name: "page",
        schema: { type: "integer", minimum: 1, default: 1 }
      },
      {
        in: "query",
        name: "limit",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
      },
      {
        in: "query",
        name: "role",
        schema: { type: "string", enum: ["JOB_SEEKER", "EMPLOYER", "ADMIN", "HR"] }
      },
      {
        in: "query",
        name: "status",
        schema: { type: "string", enum: ["active", "blocked", "inactive"] }
      },
      {
        in: "query",
        name: "search",
        schema: { type: "string" }
      },
      {
        in: "query",
        name: "verified",
        schema: { type: "boolean" }
      },
      {
        in: "query",
        name: "from_date",
        schema: { type: "string", format: "date" }
      },
      {
        in: "query",
        name: "to_date",
        schema: { type: "string", format: "date" }
      }
    ],
    responses: {
      "200": {
        description: "List of users",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                users: { type: "array", items: { $ref: "#/components/schemas/AdminUser" } },
                pagination: { $ref: "#/components/schemas/Pagination" },
                summary: {
                  type: "object",
                  properties: {
                    total_users: { type: "integer" },
                    active_users: { type: "integer" },
                    blocked_users: { type: "integer" }
                  }
                }
              }
            }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" }
    }
  }
},
"/api/admin/users/{id}": {
  get: {
    tags: ["Admin"],
    summary: "Get detailed user information",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        schema: { type: "string", format: "uuid" }
      }
    ],
    responses: {
      "200": {
        description: "User details",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AdminUser" }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "User not found" }
    }
  }
},
"/api/admin/users/{id}/block": {
  put: {
    tags: ["Admin"],
    summary: "Block or unblock a user",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        schema: { type: "string", format: "uuid" }
      }
    ],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["block"],
            properties: {
              block: { type: "boolean" },
              reason: { type: "string" }
            }
          }
        }
      }
    },
    responses: {
      "200": {
        description: "User block status updated",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string" },
                user: { $ref: "#/components/schemas/AdminUser" }
              }
            }
          }
        }
      },
      "400": { description: "Validation error" },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "User not found" }
    }
  }
},
"/api/admin/jobs": {
  get: {
    tags: ["Admin"],
    summary: "Get all jobs with filters",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "query",
        name: "page",
        schema: { type: "integer", minimum: 1, default: 1 }
      },
      {
        in: "query",
        name: "limit",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
      },
      {
        in: "query",
        name: "status",
        schema: { type: "string", enum: ["active", "closed", "draft"] }
      },
      {
        in: "query",
        name: "employer_id",
        schema: { type: "string", format: "uuid" }
      },
      {
        in: "query",
        name: "search",
        schema: { type: "string" }
      },
      {
        in: "query",
        name: "flagged",
        schema: { type: "boolean" }
      },
      {
        in: "query",
        name: "featured",
        schema: { type: "boolean" }
      }
    ],
    responses: {
      "200": {
        description: "List of jobs",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                jobs: { type: "array", items: { $ref: "#/components/schemas/AdminJob" } },
                pagination: { $ref: "#/components/schemas/Pagination" },
                summary: {
                  type: "object",
                  properties: {
                    total_jobs: { type: "integer" },
                    active_jobs: { type: "integer" },
                    flagged_jobs: { type: "integer" }
                  }
                }
              }
            }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" }
    }
  }
},
"/api/admin/jobs/{id}": {
  delete: {
    tags: ["Admin"],
    summary: "Delete a job",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        schema: { type: "string", format: "uuid" }
      }
    ],
    responses: {
      "200": {
        description: "Job deleted successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string" },
                job: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" }
                  }
                }
              }
            }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "Job not found" }
    }
  }
},
"/api/admin/jobs/{id}/feature": {
  post: {
    tags: ["Admin"],
    summary: "Feature or unfeature a job",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        schema: { type: "string", format: "uuid" }
      }
    ],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["featured"],
            properties: {
              featured: { type: "boolean" }
            }
          }
        }
      }
    },
    responses: {
      "200": {
        description: "Job feature status updated",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string" },
                job: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    is_featured: { type: "boolean" }
                  }
                }
              }
            }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "Job not found" }
    }
  }
},
"/api/admin/statistics": {
  get: {
    tags: ["Admin"],
    summary: "Get system statistics",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "query",
        name: "from_date",
        schema: { type: "string", format: "date" }
      },
      {
        in: "query",
        name: "to_date",
        schema: { type: "string", format: "date" }
      }
    ],
    responses: {
      "200": {
        description: "System statistics",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AdminStatistics" }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" }
    }
  }
},
"/api/admin/audit-logs": {
  get: {
    tags: ["Admin"],
    summary: "Get admin action logs",
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: "query",
        name: "page",
        schema: { type: "integer", minimum: 1, default: 1 }
      },
      {
        in: "query",
        name: "limit",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
      },
      {
        in: "query",
        name: "admin_id",
        schema: { type: "string", format: "uuid" }
      },
      {
        in: "query",
        name: "action",
        schema: { type: "string" }
      },
      {
        in: "query",
        name: "target_type",
        schema: { type: "string", enum: ["user", "job", "application", "company"] }
      }
    ],
    responses: {
      "200": {
        description: "Audit logs",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                logs: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      admin_name: { type: "string" },
                      action: { type: "string" },
                      target_type: { type: "string" },
                      target_id: { type: "string" },
                      details: { type: "object" },
                      created_at: { type: "string", format: "date-time" }
                    }
                  }
                },
                pagination: { $ref: "#/components/schemas/Pagination" }
              }
            }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" }
    }
  }
}
    }
  };
}