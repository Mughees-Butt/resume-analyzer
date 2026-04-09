// DTO for the text paste endpoint — POST /api/resume/text
// Defines the exact shape of the JSON body expected by the controller.
// ValidationPipe (registered globally in main.ts) enforces these decorators
// at runtime — non-string or missing values are rejected with a 400.

import { IsString, IsNotEmpty } from 'class-validator'

export class ResumeTextDto {
  @IsString()
  @IsNotEmpty()
  text!: string
}
