import { Module } from '@nestjs/common'
import { ResumeController } from './resume.controller'
import { ResumeService } from './resume.service'

@Module({
  controllers: [ResumeController],
  providers: [ResumeService],
  // ResumeService is exported so the Analysis module (Phase 2) can
  // inject it directly without re-implementing text extraction.
  exports: [ResumeService],
})
export class ResumeModule {}
