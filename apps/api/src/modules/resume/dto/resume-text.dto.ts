// DTO for the text paste endpoint — POST /api/resume/text
// Defines the exact shape of the JSON body expected by the controller.
// If 'text' is missing or not a string, NestJS rejects the request.

export class ResumeTextDto {
  text!: string
}
