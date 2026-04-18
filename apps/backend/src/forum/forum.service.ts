import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ForumPost, ForumPostDocument } from './schemas/forum-post.schema';
import { ForumComment, ForumCommentDocument } from './schemas/forum-comment.schema';

@Injectable()
export class ForumService {
  constructor(
    @InjectModel(ForumPost.name) private readonly postModel: Model<ForumPostDocument>,
    @InjectModel(ForumComment.name) private readonly commentModel: Model<ForumCommentDocument>,
  ) {}

  async createPost(createPostDto: any, userId: string, collegeId: string) {
    const post = new this.postModel({
      ...createPostDto,
      author: new Types.ObjectId(userId),
      collegeId: new Types.ObjectId(collegeId),
    });
    return (await post.save()).populate('author', 'name email');
  }

  async findAllPosts(collegeId: string) {
    const posts = await this.postModel
      .find({ collegeId: new Types.ObjectId(collegeId) })
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .exec();

    // Attach comments count
    const postsWithCounts = await Promise.all(posts.map(async (post) => {
      const commentCount = await this.commentModel.countDocuments({ post: post._id });
      return { ...post.toObject(), commentCount };
    }));

    return postsWithCounts;
  }

  async updatePost(id: string, updatePostDto: any, userId: string, userRole: string) {
    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException('Post not found');

    if (post.author.toString() !== userId && userRole !== 'COLLEGE_ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Not authorized to edit this post');
    }

    Object.assign(post, updatePostDto);
    post.isEdited = true;
    return (await post.save()).populate('author', 'name email');
  }

  async deletePost(id: string, userId: string, userRole: string) {
    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException('Post not found');

    if (post.author.toString() !== userId && userRole !== 'COLLEGE_ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Not authorized to delete this post');
    }

    await this.commentModel.deleteMany({ post: post._id });
    await this.postModel.findByIdAndDelete(id);
    return { success: true };
  }

  async toggleLike(id: string, userId: string) {
    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException('Post not found');

    const userObjectId = new Types.ObjectId(userId);
    const likeIndex = post.likes.findIndex(like => like.toString() === userId);

    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(userObjectId);
    }

    await post.save();
    return post.likes;
  }

  async addComment(postId: string, content: string, userId: string) {
    const comment = new this.commentModel({
      post: new Types.ObjectId(postId),
      author: new Types.ObjectId(userId),
      content,
    });
    return (await comment.save()).populate('author', 'name email');
  }

  async getComments(postId: string) {
    return this.commentModel
      .find({ post: new Types.ObjectId(postId) })
      .populate('author', 'name email')
      .sort({ createdAt: 1 })
      .exec();
  }

  async deleteComment(commentId: string, userId: string, userRole: string) {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.author.toString() !== userId && userRole !== 'COLLEGE_ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Not authorized to delete this comment');
    }

    await this.commentModel.findByIdAndDelete(commentId);
    return { success: true };
  }
}
