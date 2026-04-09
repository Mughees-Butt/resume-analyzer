import { Module } from '@nestjs/common'
import { ResumeController } from './resume.controller'
import { ResumeService } from './resume.service'
import { AnalysisService } from './analysis.service'

@Module({
  controllers: [ResumeController],
  providers: [ResumeService, AnalysisService],
  exports: [ResumeService, AnalysisService],
})
export class ResumeModule {}
