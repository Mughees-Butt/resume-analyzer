import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ResumeModule } from './modules/resume/resume.module'
import { QuestionsModule } from './modules/questions/questions.module'

@Module({
  imports: [ResumeModule, QuestionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
