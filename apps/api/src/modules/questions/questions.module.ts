import { Module } from '@nestjs/common'
import { QuestionsController } from './questions.controller'
import { QuestionsService } from './questions.service'

@Module({
  controllers: [QuestionsController],
  providers: [QuestionsService],
  // QuestionsService exported for use by future modules
  // (e.g. SessionModule in Phase 7, AnalyticsModule in Phase 8)
  exports: [QuestionsService],
})
export class QuestionsModule {}
