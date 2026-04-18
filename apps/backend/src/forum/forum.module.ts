import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { ForumPost, ForumPostSchema } from './schemas/forum-post.schema';
import { ForumComment, ForumCommentSchema } from './schemas/forum-comment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ForumPost.name, schema: ForumPostSchema },
      { name: ForumComment.name, schema: ForumCommentSchema },
    ]),
  ],
  controllers: [ForumController],
  providers: [ForumService],
})
export class ForumModule {}
