import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClassroomDocument = Classroom & Document;

@Schema({ timestamps: true })
export class Classroom {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'College', required: true })
  collegeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  teacherId?: Types.ObjectId;

  @Prop({ default: 'ACTIVE' })
  status: string;
}

export const ClassroomSchema = SchemaFactory.createForClass(Classroom);
