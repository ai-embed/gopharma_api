import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AssistantConversationDocument = HydratedDocument<AssistantConversation>;

@Schema({ timestamps: true, collection: 'assistant_conversations' })
export class AssistantConversation {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: false })
  title?: string;
}

export const AssistantConversationSchema = SchemaFactory.createForClass(
  AssistantConversation
);
AssistantConversationSchema.index({ userId: 1, updatedAt: -1 });
